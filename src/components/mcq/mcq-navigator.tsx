import { Eye, Flag } from "lucide-react";

import { PmButton, PmCard, PmSelect } from "@/components/pm/kit";
import { cn } from "@/lib/utils";
import { sectionLabel, type QuestionState, type SectionGroup } from "@/lib/mcq/mcq-types";

interface McqNavigatorProps {
  sections: SectionGroup[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  /** One per question in the attempt, in attempt order */
  states: QuestionState[];
  currentIndex: number;
  onJumpTo: (index: number) => void;
  onViewPaper: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

function tileClass(q: QuestionState, isCurrent: boolean) {
  if (isCurrent)
    return "bg-[image:var(--gradient-primary)] text-primary-foreground font-bold shadow-glow ring-2 ring-primary/40 ring-offset-2 ring-offset-card";
  if (q.isAnswered) return "bg-accent/85 text-accent-foreground font-semibold hover:bg-accent";
  if (q.isFlagged)
    return "border border-warning/50 bg-warning/15 text-warning font-semibold hover:bg-warning/25";
  if (q.isVisited)
    return "border border-border bg-surface-raised text-foreground hover:bg-secondary";
  return "bg-secondary/60 text-muted-foreground hover:bg-secondary";
}

function Legend({ className, label, count }: { className: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn("size-3.5 shrink-0 rounded", className)} />
      {label} ({count})
    </div>
  );
}

export function McqNavigator({
  sections,
  activeSection,
  onSectionChange,
  states,
  currentIndex,
  onJumpTo,
  onViewPaper,
}: McqNavigatorProps) {
  const group = sections.find((s) => s.section === activeSection) ?? sections[0];
  const indexes = group?.indexes ?? [];
  const inSection = indexes.map((i) => states[i]).filter((q): q is QuestionState => !!q);
  const count = (fn: (q: QuestionState) => boolean) => inSection.filter(fn).length;
  const sectionNumber = sections.findIndex((s) => s.section === group?.section) + 1;

  return (
    <PmCard className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Question navigator</h2>
        <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground">
          Section {sectionNumber} / {sections.length}
        </span>
      </div>

      {sections.length > 1 ? (
        <PmSelect
          aria-label="Section"
          value={group?.section ?? ""}
          onChange={(e) => onSectionChange(e.target.value)}
        >
          {sections.map((s) => (
            <option key={s.section} value={s.section}>
              {sectionLabel(s.section)} ({s.indexes.length} Qs)
            </option>
          ))}
        </PmSelect>
      ) : null}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-3">
        <Legend
          className="bg-accent/85"
          label="Answered"
          count={count((q) => q.isAnswered && !q.isFlagged)}
        />
        <Legend
          className="border border-warning/50 bg-warning/15"
          label="Flagged"
          count={count((q) => q.isFlagged && !q.isAnswered)}
        />
        <Legend
          className="bg-accent/85 ring-2 ring-warning"
          label="Ans. & flagged"
          count={count((q) => q.isFlagged && q.isAnswered)}
        />
        <Legend
          className="bg-secondary/60"
          label="Not visited"
          count={count((q) => !q.isVisited)}
        />
      </div>

      <div className="grid grid-cols-5 gap-2">
        {indexes.map((i) => {
          const q = states[i];
          if (!q) return null;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.questionId}
              type="button"
              onClick={() => onJumpTo(i)}
              aria-label={`Question ${i + 1}${q.isAnswered ? ", answered" : ""}${q.isFlagged ? ", flagged" : ""}`}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-xl font-mono text-sm transition-all",
                tileClass(q, isCurrent),
              )}
            >
              {pad(i + 1)}
              {!isCurrent && q.isFlagged && q.isAnswered ? (
                <Flag className="absolute right-1 top-1 size-2.5 text-warning" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Section summary
        </span>
        {sections.map((s) => {
          const answered = s.indexes.filter((i) => states[i]?.isAnswered).length;
          const active = s.section === group?.section;
          return (
            <div key={s.section} className="flex items-center justify-between font-mono text-sm">
              <span className={active ? "text-foreground" : "text-muted-foreground"}>
                {sectionLabel(s.section)}
              </span>
              <span className={active ? "font-bold text-primary-glow" : "text-muted-foreground"}>
                {answered} / {s.indexes.length}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-3 font-mono text-xs text-muted-foreground">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-widest">
          Keyboard shortcuts
        </span>
        <div className="flex justify-between">
          <span>Select option</span>
          <span className="text-foreground">[1] [2] [3] [4]</span>
        </div>
        <div className="flex justify-between">
          <span>Next / Previous</span>
          <span className="text-foreground">[N] / [P]</span>
        </div>
        <div className="flex justify-between">
          <span>Flag / Clear</span>
          <span className="text-foreground">[F] / [C]</span>
        </div>
      </div>

      <PmButton variant="outline" size="sm" block onClick={onViewPaper}>
        <Eye /> View question paper
      </PmButton>
    </PmCard>
  );
}
