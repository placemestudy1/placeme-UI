import { ArrowLeft, ArrowRight, CheckCheck, Flag } from "lucide-react";

import { PmBadge, PmButton, PmCard } from "@/components/pm/kit";
import { difficultyLabel, topicLabel, type BankQuestion } from "@/lib/mcq/mcq-types";
import { McqOptionCard } from "./mcq-option-card";

interface McqQuestionCardProps {
  question: BankQuestion;
  number: number;
  selectedAnswer: number | null;
  isFlagged: boolean;
  onAnswer: (index: number) => void;
  onClearAnswer: () => void;
  onFlag: () => void;
  onPrevious: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const DIFFICULTY_TONE = { 1: "success", 2: "warning", 3: "danger" } as const;

export function McqQuestionCard({
  question,
  number,
  selectedAnswer,
  isFlagged,
  onAnswer,
  onClearAnswer,
  onFlag,
  onPrevious,
  onNext,
  isFirst,
  isLast,
}: McqQuestionCardProps) {
  const tone = DIFFICULTY_TONE[question.difficulty as 1 | 2 | 3] ?? "neutral";
  return (
    <PmCard className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)] font-mono text-base font-bold text-primary-foreground">
            {pad(number)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Single choice question
            </p>
            <p className="truncate font-display text-lg font-semibold">
              {topicLabel(question.topic)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PmBadge tone={tone}>{difficultyLabel(question.difficulty)}</PmBadge>
          {selectedAnswer !== null ? (
            <PmBadge tone="accent">
              <CheckCheck className="size-3.5" /> Answered
            </PmBadge>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-6 sm:px-7">
        {/* Plain text from the reviewed bank; whitespace keeps any line breaks. */}
        <p className="whitespace-pre-line text-lg leading-relaxed">{question.stem}</p>

        <div className="mt-6 flex flex-col gap-3" role="radiogroup" aria-label="Answer options">
          {question.options.map((text, i) => (
            <McqOptionCard
              key={i}
              questionId={question.id}
              index={i}
              text={text}
              selected={selectedAnswer === i}
              onSelect={onAnswer}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <PmButton variant="secondary" size="sm" onClick={onPrevious} disabled={isFirst}>
            <ArrowLeft /> Previous
          </PmButton>
          <PmButton
            variant="ghost"
            size="sm"
            onClick={onClearAnswer}
            disabled={selectedAnswer === null}
          >
            Clear answer
          </PmButton>
          <PmButton
            variant={isFlagged ? "outline" : "ghost"}
            size="sm"
            onClick={onFlag}
            aria-pressed={isFlagged}
            className={isFlagged ? "border-warning/50 text-warning" : undefined}
          >
            <Flag /> {isFlagged ? "Flagged" : "Flag"}
          </PmButton>
        </div>
        <PmButton size="sm" onClick={onNext}>
          {isLast ? "Review & finish" : "Save & next"} <ArrowRight />
        </PmButton>
      </div>
    </PmCard>
  );
}
