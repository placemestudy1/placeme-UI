import { BookOpen, Calculator, ChevronRight } from "lucide-react";

import { PmButton, PmCard } from "@/components/pm/kit";
import { sectionLabel, topicLabel } from "@/lib/mcq/mcq-types";

interface McqBreadcrumbBarProps {
  section: string;
  topic: string;
  questionNumber: number;
  totalQuestions: number;
  answeredTotal: number;
  onInstructionsOpen: () => void;
  onCalculatorToggle: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function McqBreadcrumbBar({
  section,
  topic,
  questionNumber,
  totalQuestions,
  answeredTotal,
  onInstructionsOpen,
  onCalculatorToggle,
}: McqBreadcrumbBarProps) {
  const percent = totalQuestions > 0 ? Math.round((answeredTotal / totalQuestions) * 100) : 0;

  return (
    <PmCard className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="font-semibold text-primary-glow">{sectionLabel(section)}</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{topicLabel(topic)}</span>
        </div>
        <span className="rounded-lg bg-secondary px-2 py-1 font-mono text-xs font-semibold text-muted-foreground">
          Q.{pad(questionNumber)} of {totalQuestions}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-60 flex-1 items-center gap-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{answeredTotal}</span> of{" "}
            {totalQuestions} answered
          </div>
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Answered"
          >
            <div
              className="h-full rounded-full bg-[image:var(--gradient-primary)] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold text-accent">{percent}%</span>
        </div>
        <div className="flex items-center gap-2">
          <PmButton variant="secondary" size="sm" onClick={onInstructionsOpen}>
            <BookOpen /> <span className="hidden md:inline">Instructions</span>
          </PmButton>
          <PmButton variant="secondary" size="sm" onClick={onCalculatorToggle}>
            <Calculator /> <span className="hidden md:inline">Calculator</span>
          </PmButton>
        </div>
      </div>
    </PmCard>
  );
}
