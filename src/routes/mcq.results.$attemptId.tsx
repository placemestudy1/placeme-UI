/**
 * MCQ results (SPEC-0017 R7): score, score by section and topic, and every
 * question with the student's answer, the key, the explanation and time.
 *
 * Built locally from the submit response + the bundle. On another device (no
 * local copy) it falls back to the student's own attempt row and 0034's
 * get_mcq_attempt_questions, which only returns keys once submitted.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock3, Flag, Lightbulb, X } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { requireFeatureFlag } from "@/lib/feature-flags";
import {
  Banner,
  CardSkeleton,
  ErrorState,
  PmBadge,
  PmButton,
  PmCard,
  ScoreBar,
  ScoreRing,
  SectionTitle,
} from "@/components/pm/kit";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase-client";
import type { McqSubmitResult } from "@/lib/api";
import { loadResult, loadResultMeta } from "@/lib/mcq/attempt-store";
import { bankClient, questionsForAttempt } from "@/lib/mcq/bank";
import {
  OPTION_LABELS,
  sectionLabel,
  topicLabel,
  type BankQuestion,
  type McqAnswers,
} from "@/lib/mcq/mcq-types";
import { buildResults, type AttemptResults, type ResultRow } from "@/lib/mcq/results";
import { formatDuration } from "@/lib/mcq/timer";

export const Route = createFileRoute("/mcq/results/$attemptId")({
  head: () => ({ meta: [{ title: "Test results · PlaceMe" }] }),
  // Client-only: the page runs on local storage and timers, so server
  // rendering adds nothing, and the flag check below then runs in the
  // browser like every other feature_flags read.
  ssr: false,
  beforeLoad: ({ context }) => requireFeatureFlag(context.queryClient, "mcq"),
  component: () => (
    <ProtectedRoute requireConsent={false}>
      <ResultsPage />
    </ProtectedRoute>
  ),
});

interface Loaded {
  results: AttemptResults;
  testName: string | null;
  expired: boolean;
}

async function loadFromDevice(attemptId: string): Promise<Loaded | null> {
  const result = loadResult(attemptId);
  const meta = loadResultMeta(attemptId);
  if (!result || !meta) return null;
  const bank = meta.bankVersion
    ? await bankClient.getBankVersion(meta.bankVersion)
    : await bankClient.getCurrentBank();
  return {
    results: buildResults(questionsForAttempt(bank, meta.questionIds), meta.answers, result),
    testName: bank.tests.find((t) => t.id === meta.testId)?.name ?? null,
    expired: result.submitReason === "expired",
  };
}

interface QuestionRow {
  question_id: string;
  section: string;
  topic: string;
  difficulty: number;
  stem: string;
  options: string[];
  correct_index: number | null;
  explanation: string | null;
}

async function loadFromServer(attemptId: string): Promise<Loaded> {
  const { data: row, error } = await supabase
    .from("mcq_attempts")
    .select("answers, score, submitted_at, submit_reason")
    .eq("id", attemptId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("This test attempt wasn't found.");
  if (!row.submitted_at) throw new Error("This test hasn't been submitted yet.");
  const { data: rows, error: rpcError } = await supabase.rpc("get_mcq_attempt_questions", {
    p_attempt_id: attemptId,
  });
  if (rpcError) throw rpcError;
  const qs = (rows ?? []) as QuestionRow[];
  const questions: BankQuestion[] = qs.map((q) => ({
    id: q.question_id,
    section: q.section,
    topic: q.topic,
    difficulty: q.difficulty,
    stem: q.stem,
    options: q.options,
  }));
  const result: Pick<McqSubmitResult, "score" | "keys"> = {
    score: (row.score as number | null) ?? 0,
    keys: qs.map((q) => ({
      questionId: q.question_id,
      correctIndex: q.correct_index ?? 0,
      explanation: q.explanation,
    })),
  };
  return {
    results: buildResults(questions, (row.answers ?? {}) as McqAnswers, result),
    testName: null,
    expired: row.submit_reason === "expired",
  };
}

type Filter = "all" | "wrong" | "unanswered" | "flagged";

function ResultsPage() {
  const { attemptId } = Route.useParams();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  function load() {
    setError(null);
    loadFromDevice(attemptId)
      .then((local) => local ?? loadFromServer(attemptId))
      .then(setLoaded)
      .catch((e: Error) => setError(e.message));
  }

  useEffect(load, [attemptId]);

  const rows = useMemo(() => {
    if (!loaded) return [];
    const all = loaded.results.rows.map((r, i) => [i, r] as const);
    if (filter === "wrong") return all.filter(([, r]) => r.chosen !== null && !r.isCorrect);
    if (filter === "unanswered") return all.filter(([, r]) => r.chosen === null);
    if (filter === "flagged") return all.filter(([, r]) => r.flagged);
    return all;
  }, [loaded, filter]);

  const actions = (
    <PmButton asChild variant="outline" size="sm">
      <Link to="/mcq">Practice tests</Link>
    </PmButton>
  );

  if (error) {
    return (
      <WebShell title="Test results" actions={actions}>
        <ErrorState description={error} onRetry={load} />
      </WebShell>
    );
  }
  if (!loaded) {
    return (
      <WebShell title="Test results">
        <div className="grid gap-5 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </WebShell>
    );
  }

  const { results } = loaded;
  const percent = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;

  return (
    <WebShell
      title={loaded.testName ? `${loaded.testName} results` : "Test results"}
      actions={actions}
    >
      {loaded.expired ? (
        <div className="mb-5">
          <Banner
            tone="warning"
            title="Time ran out"
            description="We scored the answers that were saved when the timer reached zero."
          />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <PmCard className="flex flex-col items-center gap-4 p-6 text-center">
          <ScoreRing score={percent} />
          <div>
            <p className="font-display text-2xl font-bold">
              {results.score} / {results.total} correct
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {results.answered} answered · {formatDuration(results.totalTimeMs)} spent
            </p>
          </div>
          <PmButton asChild block>
            <Link to="/mcq">Take another test</Link>
          </PmButton>
        </PmCard>

        <PmCard className="p-6 lg:col-span-2">
          <SectionTitle title="By section" />
          <div className="space-y-4">
            {results.sections.map((s) => (
              <ScoreBar
                key={s.section}
                label={`${sectionLabel(s.section)} · ${s.correct}/${s.total}`}
                score={s.total ? Math.round((s.correct / s.total) * 100) : 0}
              />
            ))}
          </div>
          <div className="mt-6">
            <SectionTitle title="By topic" />
            <div className="grid gap-2 sm:grid-cols-2">
              {results.topics.map((t) => {
                const pct = t.total ? Math.round((t.correct / t.total) * 100) : 0;
                return (
                  <div
                    key={`${t.section}/${t.topic}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                  >
                    <span className="truncate">{topicLabel(t.topic ?? "")}</span>
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        pct >= 70
                          ? "text-success"
                          : pct >= 40
                            ? "text-warning"
                            : "text-destructive",
                      )}
                    >
                      {t.correct}/{t.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </PmCard>
      </div>

      <div className="mt-8">
        <SectionTitle
          title="Review answers"
          action={
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter questions">
              {(["all", "wrong", "unanswered", "flagged"] as const).map((f) => (
                <PmButton
                  key={f}
                  size="sm"
                  variant={filter === f ? "secondary" : "ghost"}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f === "all"
                    ? "All"
                    : f === "wrong"
                      ? "Incorrect"
                      : f === "unanswered"
                        ? "Unanswered"
                        : "Flagged"}
                </PmButton>
              ))}
            </div>
          }
        />
        <div className="flex flex-col gap-4">
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
              No questions match this filter.
            </p>
          ) : (
            rows.map(([i, r]) => <ReviewCard key={r.question.id} number={i + 1} row={r} />)
          )}
        </div>
      </div>
    </WebShell>
  );
}

function ReviewCard({ number, row }: { number: number; row: ResultRow }) {
  const status = row.chosen === null ? "unanswered" : row.isCorrect ? "correct" : "wrong";
  return (
    <PmCard className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono font-bold text-primary-glow">
            Q.{String(number).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground">
            {sectionLabel(row.question.section)} · {topicLabel(row.question.topic)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {row.flagged ? (
            <PmBadge tone="warning">
              <Flag className="size-3" /> Flagged
            </PmBadge>
          ) : null}
          <PmBadge tone="neutral">
            <Clock3 className="size-3" /> {formatDuration(row.timeMs)}
          </PmBadge>
          <PmBadge
            tone={status === "correct" ? "success" : status === "wrong" ? "danger" : "neutral"}
          >
            {status === "correct" ? "Correct" : status === "wrong" ? "Incorrect" : "Not answered"}
          </PmBadge>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line leading-relaxed">{row.question.stem}</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {row.question.options.map((text, i) => {
          const isKey = i === row.correct;
          const isChosen = i === row.chosen;
          return (
            <li
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                isKey
                  ? "border-success/40 bg-success/10"
                  : isChosen
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-border bg-surface",
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary font-mono text-xs font-bold">
                {OPTION_LABELS[i]}
              </span>
              <span className="min-w-0 flex-1">{text}</span>
              {isKey ? (
                <Check className="size-4 shrink-0 text-success" aria-label="Correct answer" />
              ) : null}
              {isChosen && !isKey ? (
                <X className="size-4 shrink-0 text-destructive" aria-label="Your answer" />
              ) : null}
              {isChosen ? <span className="sr-only">(your answer)</span> : null}
            </li>
          );
        })}
      </ul>
      {row.explanation ? (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary-glow" />
          <p className="leading-relaxed text-muted-foreground">{row.explanation}</p>
        </div>
      ) : null}
    </PmCard>
  );
}
