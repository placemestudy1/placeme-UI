import { ArrowLeft, ArrowRight, Flag } from "lucide-react";

import { PmButton } from "@/components/pm/kit";

interface McqBottomDockProps {
  onPrevious: () => void;
  onClearAnswer: () => void;
  onFlag: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  hasAnswer: boolean;
  isFlagged: boolean;
  questionNumber: number;
  totalQuestions: number;
  answeredTotal: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function McqBottomDock({
  onPrevious,
  onClearAnswer,
  onFlag,
  onNext,
  isFirst,
  isLast,
  hasAnswer,
  isFlagged,
  questionNumber,
  totalQuestions,
  answeredTotal,
}: McqBottomDockProps) {
  const percent = totalQuestions > 0 ? Math.round((answeredTotal / totalQuestions) * 100) : 0;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-1">
          <PmButton variant="ghost" size="sm" onClick={onPrevious} disabled={isFirst}>
            <ArrowLeft /> <span className="hidden sm:inline">Previous</span>
          </PmButton>
          <PmButton
            variant="ghost"
            size="sm"
            onClick={onClearAnswer}
            disabled={!hasAnswer}
            className="hidden sm:inline-flex"
          >
            Clear response
          </PmButton>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <span className="font-mono text-xs text-muted-foreground">
            Question {pad(questionNumber)} of {totalQuestions}
          </span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-[image:var(--gradient-primary)]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold text-accent">{percent}% answered</span>
        </div>
        <div className="flex items-center gap-2">
          <PmButton
            variant="secondary"
            size="sm"
            onClick={onFlag}
            aria-pressed={isFlagged}
            className={isFlagged ? "text-warning" : undefined}
          >
            <Flag />{" "}
            <span className="hidden sm:inline">{isFlagged ? "Flagged" : "Mark for review"}</span>
          </PmButton>
          <PmButton size="sm" onClick={onNext}>
            {isLast ? "Review & finish" : "Save & next"} <ArrowRight />
          </PmButton>
        </div>
      </div>
    </footer>
  );
}
