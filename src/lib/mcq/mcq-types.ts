/**
 * Types and display labels for MCQ practice tests (SPEC-0017).
 *
 * Question text and test templates come from the public keyless bundle the
 * gd-proto seed script publishes to the `mcq-bank` storage bucket (see
 * bank.ts). Attempt state goes through the API (src/lib/api.ts); answer keys
 * only arrive in the submit response.
 */
import type { McqAnswer, McqAnswers } from "@/lib/api";

export type { McqAnswer, McqAnswers };

/** One question as published in the bundle: no answer key, no explanation. */
export interface BankQuestion {
  id: string;
  section: string;
  topic: string;
  /** 1 = easy, 2 = moderate, 3 = hard */
  difficulty: number;
  stem: string;
  /** Always four options; the chosen index (0-3) is what gets saved. */
  options: string[];
}

export interface BankTest {
  id: string;
  name: string;
  /** Questions per section, e.g. { aptitude: 20, technical: 10 } */
  sectionMix: Record<string, number>;
  questionCount: number;
  durationSeconds: number;
}

export interface Bank {
  version: string;
  questions: BankQuestion[];
  tests: BankTest[];
}

/** Navigator tile state for one question, derived from the answers map. */
export interface QuestionState {
  questionId: string;
  selectedAnswer: number | null;
  isFlagged: boolean;
  isVisited: boolean;
  isAnswered: boolean;
}

export interface SectionGroup {
  section: string;
  /** Indexes into the attempt's ordered question list */
  indexes: number[];
}

export const OPTION_LABELS = ["A", "B", "C", "D"] as const;

const SECTION_LABELS: Record<string, string> = {
  aptitude: "Aptitude",
  technical: "Technical",
};

const TOPIC_LABELS: Record<string, string> = {
  quant: "Quantitative",
  logical: "Logical reasoning",
  verbal: "Verbal ability",
  dsa: "Data structures & algorithms",
  oop: "Object-oriented programming",
  dbms: "Databases",
  os: "Operating systems",
  cn: "Computer networks",
  programming: "Programming",
};

const DIFFICULTY_LABELS: Record<number, string> = { 1: "Easy", 2: "Moderate", 3: "Hard" };

export const sectionLabel = (s: string) => SECTION_LABELS[s] ?? s;
export const topicLabel = (t: string) => TOPIC_LABELS[t] ?? t;
export const difficultyLabel = (d: number) => DIFFICULTY_LABELS[d] ?? "—";
