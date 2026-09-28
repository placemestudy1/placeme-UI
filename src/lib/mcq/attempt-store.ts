/**
 * Local copy of an in-progress MCQ attempt (SPEC-0017 R3/AC7). Every answer,
 * flag and time change is written here first, so a refresh resumes exactly
 * where the student was; the server only gets batched checkpoints.
 *
 * localStorage, not IndexedDB: an attempt is at most ~200 small entries, well
 * under any quota, and a synchronous API keeps the write-on-every-change path
 * simple. Every access is wrapped -- private mode or blocked storage just
 * means no local resume, and the server checkpoint is the fallback.
 */
import type { McqAttemptStart, McqSubmitResult } from "@/lib/api";
import type { McqAnswers } from "./mcq-types";

export interface StoredAttempt {
  attemptId: string;
  testId: string;
  questionIds: string[];
  bankVersion: string | null;
  endAt: string;
  /** server clock minus client clock, ms, measured at start */
  serverOffsetMs: number;
  answers: McqAnswers;
  /** highest checkpoint seq the server has accepted (or we've sent) */
  sentSeq: number;
  /** answers changed since the last accepted checkpoint */
  dirty: boolean;
  currentIndex: number;
  visited: string[];
}

const PREFIX = "placeme.mcq";
const attemptKey = (id: string) => `${PREFIX}.attempt.${id}`;
const resultKey = (id: string) => `${PREFIX}.result.${id}`;
const OPEN_KEY = `${PREFIX}.open`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the server checkpoint still covers us.
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const loadAttempt = (attemptId: string) => read<StoredAttempt>(attemptKey(attemptId));
export const saveAttempt = (attempt: StoredAttempt) =>
  write(attemptKey(attempt.attemptId), attempt);
export const getOpenAttemptId = () => read<string>(OPEN_KEY);

export const loadResult = (attemptId: string) => read<McqSubmitResult>(resultKey(attemptId));

/** What the results page needs once the resume state is gone. */
export interface ResultMeta {
  testId: string;
  questionIds: string[];
  bankVersion: string | null;
  answers: McqAnswers;
}

/** Stores the result and drops the in-progress copy and the open marker. */
export function saveResult(
  attemptId: string,
  result: McqSubmitResult,
  attempt?: StoredAttempt | null,
) {
  write(resultKey(attemptId), result);
  if (attempt) {
    const meta: ResultMeta = {
      testId: attempt.testId,
      questionIds: attempt.questionIds,
      bankVersion: attempt.bankVersion,
      answers: attempt.answers,
    };
    write(`${resultKey(attemptId)}.meta`, meta);
  }
  remove(attemptKey(attemptId));
  if (getOpenAttemptId() === attemptId) remove(OPEN_KEY);
}

export const loadResultMeta = (attemptId: string) =>
  read<ResultMeta>(`${resultKey(attemptId)}.meta`);

/** The student's own mcq_attempts row, read directly under 0034's read-own RLS. */
export interface AttemptRow {
  id: string;
  test_id: string;
  question_ids: string[];
  bank_version: string | null;
  end_at: string;
  answers: McqAnswers | null;
  checkpoint_seq: number;
  submitted_at: string | null;
}

/**
 * New device or cleared storage (AC7): rebuilds the local attempt from the
 * last server checkpoint. No server clock sample here, so no offset.
 */
export function attemptFromRow(row: AttemptRow): StoredAttempt {
  const attempt: StoredAttempt = {
    attemptId: row.id,
    testId: row.test_id,
    questionIds: row.question_ids,
    bankVersion: row.bank_version,
    endAt: row.end_at,
    serverOffsetMs: 0,
    answers: row.answers ?? {},
    sentSeq: row.checkpoint_seq,
    dirty: false,
    currentIndex: 0,
    visited: [],
  };
  saveAttempt(attempt);
  write(OPEN_KEY, attempt.attemptId);
  return attempt;
}

/**
 * Builds the local attempt from a start response, keeping local progress when
 * we already have this attempt: local state is written before any checkpoint
 * is sent, so it is never older than the server's copy.
 */
export function attemptFromStart(start: McqAttemptStart, clientNowMs: number): StoredAttempt {
  const local = loadAttempt(start.attemptId);
  const attempt: StoredAttempt = {
    attemptId: start.attemptId,
    testId: start.testId,
    questionIds: start.questionIds,
    bankVersion: start.bankVersion,
    endAt: start.endAt,
    serverOffsetMs: Date.parse(start.now) - clientNowMs,
    answers: local ? local.answers : (start.answers ?? {}),
    sentSeq: Math.max(local?.sentSeq ?? 0, start.checkpointSeq),
    dirty: local?.dirty ?? false,
    currentIndex: local?.currentIndex ?? 0,
    visited: local?.visited ?? [],
  };
  saveAttempt(attempt);
  write(OPEN_KEY, attempt.attemptId);
  return attempt;
}
