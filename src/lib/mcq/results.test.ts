import { describe, expect, it } from "vitest";

import { buildResults } from "./results";
import type { BankQuestion } from "./mcq-types";

const q = (id: string, section: string, topic: string): BankQuestion => ({
  id,
  section,
  topic,
  difficulty: 1,
  stem: `stem ${id}`,
  options: ["a", "b", "c", "d"],
});

const questions = [
  q("q1", "aptitude", "quant"),
  q("q2", "aptitude", "verbal"),
  q("q3", "technical", "os"),
];

const result = {
  score: 1,
  keys: [
    { questionId: "q1", correctIndex: 2, explanation: "because" },
    { questionId: "q2", correctIndex: 0, explanation: null },
    { questionId: "q3", correctIndex: 1, explanation: "os" },
  ],
};

describe("buildResults", () => {
  const answers = {
    q1: { c: 2, t: 4000, r: false },
    q2: { c: 3, t: 1000, r: true },
    // q3 unanswered
  };

  it("marks each question right, wrong or unanswered with its key and time", () => {
    const r = buildResults(questions, answers, result);
    expect(r.rows.map((row) => [row.question.id, row.chosen, row.correct, row.isCorrect])).toEqual([
      ["q1", 2, 2, true],
      ["q2", 3, 0, false],
      ["q3", null, 1, false],
    ]);
    expect(r.rows[0]?.explanation).toBe("because");
    expect(r.rows[1]?.flagged).toBe(true);
  });

  it("totals score, answered count and time", () => {
    const r = buildResults(questions, answers, result);
    expect(r).toMatchObject({ score: 1, total: 3, answered: 2, totalTimeMs: 5000 });
  });

  it("breaks the score down by section and by topic, in question order", () => {
    const r = buildResults(questions, answers, result);
    expect(r.sections).toEqual([
      { section: "aptitude", correct: 1, total: 2 },
      { section: "technical", correct: 0, total: 1 },
    ]);
    expect(r.topics).toEqual([
      { section: "aptitude", topic: "quant", correct: 1, total: 1 },
      { section: "aptitude", topic: "verbal", correct: 0, total: 1 },
      { section: "technical", topic: "os", correct: 0, total: 1 },
    ]);
  });
});
