/**
 * Results breakdown for a submitted attempt (SPEC-0017 R7), computed locally
 * from the bundle questions, the student's own answers and the submit
 * response's keys -- no extra request.
 */
import type { McqSubmitResult } from "@/lib/api";
import type { BankQuestion, McqAnswers } from "./mcq-types";

export interface ResultRow {
  question: BankQuestion;
  chosen: number | null;
  correct: number | null;
  explanation: string | null;
  timeMs: number;
  flagged: boolean;
  isCorrect: boolean;
}

export interface Breakdown {
  section: string;
  topic?: string;
  correct: number;
  total: number;
}

export interface AttemptResults {
  score: number;
  total: number;
  answered: number;
  totalTimeMs: number;
  rows: ResultRow[];
  sections: Breakdown[];
  topics: Breakdown[];
}

function tally(
  map: Map<string, Breakdown>,
  key: string,
  base: Omit<Breakdown, "correct" | "total">,
  isCorrect: boolean,
) {
  const entry = map.get(key) ?? { ...base, correct: 0, total: 0 };
  entry.total += 1;
  if (isCorrect) entry.correct += 1;
  map.set(key, entry);
}

export function buildResults(
  questions: BankQuestion[],
  answers: McqAnswers,
  result: Pick<McqSubmitResult, "score" | "keys">,
): AttemptResults {
  const keys = new Map(result.keys.map((k) => [k.questionId, k]));
  const sections = new Map<string, Breakdown>();
  const topics = new Map<string, Breakdown>();

  const rows = questions.map((question) => {
    const answer = answers[question.id];
    const key = keys.get(question.id);
    const chosen = answer?.c ?? null;
    const correct = key?.correctIndex ?? null;
    const isCorrect = chosen !== null && chosen === correct;
    tally(sections, question.section, { section: question.section }, isCorrect);
    tally(
      topics,
      `${question.section}/${question.topic}`,
      { section: question.section, topic: question.topic },
      isCorrect,
    );
    return {
      question,
      chosen,
      correct,
      explanation: key?.explanation ?? null,
      timeMs: answer?.t ?? 0,
      flagged: answer?.r ?? false,
      isCorrect,
    };
  });

  return {
    score: result.score,
    total: questions.length,
    answered: rows.filter((r) => r.chosen !== null).length,
    totalTimeMs: rows.reduce((sum, r) => sum + r.timeMs, 0),
    rows,
    sections: [...sections.values()],
    topics: [...topics.values()],
  };
}
