/**
 * Runs one MCQ attempt in the browser (SPEC-0017 user flow steps 3-6):
 *
 * - every answer/flag change is written to local storage at once;
 * - time on the current question accumulates locally every second;
 * - a checkpoint goes to the server every 60s only if an answer or flag
 *   changed (time alone doesn't trigger one), and on tab hide with
 *   `keepalive`;
 * - at zero the attempt auto-submits; a `closed` checkpoint also submits
 *   (the server then scores its last checkpoint).
 *
 * Resume order: local copy → the student's own mcq_attempts row (read-own
 * RLS) → "not found".
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { checkpointMcqAttempt, submitMcqAttempt } from "@/lib/api";
import { supabase } from "@/lib/supabase-client";
import {
  attemptFromRow,
  loadAttempt,
  loadResult,
  saveAttempt,
  saveResult,
  type AttemptRow,
  type StoredAttempt,
} from "./attempt-store";
import { bankClient, questionsForAttempt } from "./bank";
import type { BankQuestion, BankTest } from "./mcq-types";
import { remainingSeconds } from "./timer";

export const CHECKPOINT_INTERVAL_MS = 60_000;

export type AttemptStatus = "loading" | "ready" | "submitting" | "submitted" | "error";

/** Who ended the attempt: the student, or the clock (timer at zero or a `closed` checkpoint). */
export type SubmitTrigger = "student" | "timeout";

async function loadAttemptRow(attemptId: string): Promise<AttemptRow | null> {
  const { data, error } = await supabase
    .from("mcq_attempts")
    .select(
      "id, test_id, question_ids, bank_version, end_at, answers, checkpoint_seq, submitted_at",
    )
    .eq("id", attemptId)
    .maybeSingle();
  if (error) throw error;
  return data as AttemptRow | null;
}

export function useMcqAttempt(attemptId: string, session: Session | null) {
  const [status, setStatus] = useState<AttemptStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<StoredAttempt | null>(null);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [test, setTest] = useState<BankTest | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [submitTrigger, setSubmitTrigger] = useState<SubmitTrigger | null>(null);

  // The latest attempt for timers/listeners, without re-subscribing them.
  const attemptRef = useRef<StoredAttempt | null>(null);
  const statusRef = useRef<AttemptStatus>("loading");
  const changeCounter = useRef(0);
  const checkpointInFlight = useRef(false);
  const lastTickMs = useRef(Date.now());

  const setStatusBoth = (s: AttemptStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  // Every mutation goes through here: memory, ref and local storage together.
  const commit = useCallback((next: StoredAttempt) => {
    attemptRef.current = next;
    saveAttempt(next);
    setAttempt(next);
  }, []);

  /* ------------------------------- loading -------------------------------- */

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (loadResult(attemptId)) {
          setStatusBoth("submitted");
          return;
        }
        let local = loadAttempt(attemptId);
        if (!local) {
          const row = await loadAttemptRow(attemptId);
          if (!row) throw new Error("This test attempt wasn't found.");
          if (row.submitted_at) {
            if (!cancelled) setStatusBoth("submitted");
            return;
          }
          local = attemptFromRow(row);
        }
        const bank = local.bankVersion
          ? await bankClient.getBankVersion(local.bankVersion)
          : await bankClient.getCurrentBank();
        if (cancelled) return;
        attemptRef.current = local;
        setAttempt(local);
        setQuestions(questionsForAttempt(bank, local.questionIds));
        setTest(bank.tests.find((t) => t.id === local.testId) ?? null);
        setRemaining(remainingSeconds(local.endAt, local.serverOffsetMs));
        lastTickMs.current = Date.now();
        setStatusBoth("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Couldn't load this test.");
        setStatusBoth("error");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  /* ------------------------------- submit --------------------------------- */

  const submit = useCallback(
    async (trigger: SubmitTrigger = "student") => {
      const current = attemptRef.current;
      if (!current || statusRef.current === "submitting" || statusRef.current === "submitted")
        return;
      setSubmitTrigger(trigger);
      setStatusBoth("submitting");
      try {
        const result = await submitMcqAttempt(session, current.attemptId, current.answers);
        saveResult(current.attemptId, result, current);
        setStatusBoth("submitted");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Submit failed. Try again.");
        setStatusBoth("ready");
      }
    },
    [session],
  );

  /* ----------------------------- checkpoints ------------------------------ */

  const checkpoint = useCallback(
    async ({ keepalive = false } = {}) => {
      const current = attemptRef.current;
      if (!current || !current.dirty || checkpointInFlight.current || statusRef.current !== "ready")
        return;
      checkpointInFlight.current = true;
      const seq = current.sentSeq + 1;
      const changesAtSend = changeCounter.current;
      try {
        const { status: result } = await checkpointMcqAttempt(
          session,
          current.attemptId,
          { seq, answers: current.answers },
          { keepalive },
        );
        const latest = attemptRef.current;
        if (!latest) return;
        if (result === "closed") {
          void submit("timeout");
          return;
        }
        // `stale`: the server already has a higher seq (another tab/device);
        // move past it and send again on the next tick.
        commit({
          ...latest,
          sentSeq: seq,
          dirty: result === "stale" || changeCounter.current !== changesAtSend,
        });
      } catch {
        // Network blip: stay dirty and retry on the next interval.
      } finally {
        checkpointInFlight.current = false;
      }
    },
    [session, submit, commit],
  );

  // Clock tick: remaining time, time on the current question, auto-submit.
  useEffect(() => {
    if (status !== "ready") return undefined;
    const id = setInterval(() => {
      const current = attemptRef.current;
      if (!current) return;
      const now = Date.now();
      const elapsed = now - lastTickMs.current;
      lastTickMs.current = now;
      const qid = current.questionIds[current.currentIndex];
      if (qid) {
        const entry = current.answers[qid] ?? { c: null, t: 0, r: false };
        // Time alone doesn't mark the attempt dirty -- it rides along with
        // the next checkpoint or the submit.
        commit({
          ...current,
          answers: { ...current.answers, [qid]: { ...entry, t: (entry.t ?? 0) + elapsed } },
        });
      }
      const left = remainingSeconds(current.endAt, current.serverOffsetMs, now);
      setRemaining(left);
      if (left <= 0) void submit("timeout");
    }, 1000);
    return () => clearInterval(id);
  }, [status, submit, commit]);

  useEffect(() => {
    if (status !== "ready") return undefined;
    const id = setInterval(() => void checkpoint(), CHECKPOINT_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void checkpoint({ keepalive: true });
      else lastTickMs.current = Date.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, checkpoint]);

  /* ------------------------------- actions -------------------------------- */

  const change = useCallback(
    (fn: (a: StoredAttempt, qid: string) => StoredAttempt) => {
      const current = attemptRef.current;
      if (!current || statusRef.current !== "ready") return;
      const qid = current.questionIds[current.currentIndex];
      if (!qid) return;
      changeCounter.current += 1;
      commit({ ...fn(current, qid), dirty: true });
    },
    [commit],
  );

  const setAnswer = useCallback(
    (choice: number | null) =>
      change((a, qid) => {
        const entry = a.answers[qid] ?? { c: null, t: 0, r: false };
        return { ...a, answers: { ...a.answers, [qid]: { ...entry, c: choice } } };
      }),
    [change],
  );

  const toggleFlag = useCallback(
    () =>
      change((a, qid) => {
        const entry = a.answers[qid] ?? { c: null, t: 0, r: false };
        return { ...a, answers: { ...a.answers, [qid]: { ...entry, r: !entry.r } } };
      }),
    [change],
  );

  const goTo = useCallback(
    (index: number) => {
      const current = attemptRef.current;
      if (!current || index < 0 || index >= current.questionIds.length) return;
      const qid = current.questionIds[index];
      const visited =
        qid && !current.visited.includes(qid) ? [...current.visited, qid] : current.visited;
      commit({ ...current, currentIndex: index, visited });
    },
    [commit],
  );

  // The first question counts as visited as soon as the test opens.
  useEffect(() => {
    if (status === "ready" && attemptRef.current) goTo(attemptRef.current.currentIndex);
  }, [status, goTo]);

  return {
    status,
    error,
    attempt,
    questions,
    test,
    remaining,
    setAnswer,
    toggleFlag,
    goTo,
    submit,
    submitTrigger,
  };
}
