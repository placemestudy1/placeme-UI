import { Flag, LayoutGrid, Timer } from "lucide-react";

import { Logo } from "@/components/pm/web-shell";
import { PmAvatar, PmBadge, PmButton } from "@/components/pm/kit";
import { cn } from "@/lib/utils";
import { sectionLabel, type SectionGroup } from "@/lib/mcq/mcq-types";
import { formatClock, timerTone } from "@/lib/mcq/timer";
import { McqTimeAlert, type TimeAlert } from "./mcq-time-alert";

interface McqTopBarProps {
  testName: string;
  candidateName: string;
  remainingSeconds: number;
  sections: SectionGroup[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  flaggedCount: number;
  onTogglePalette: () => void;
  onFinish: () => void;
  timeAlert: TimeAlert | null;
  onDismissTimeAlert: () => void;
}

export function McqTopBar({
  testName,
  candidateName,
  remainingSeconds,
  sections,
  activeSection,
  onSectionChange,
  flaggedCount,
  onTogglePalette,
  onFinish,
  timeAlert,
  onDismissTimeAlert,
}: McqTopBarProps) {
  const initials = candidateName
    .split(/\s+/)
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const tone = timerTone(remainingSeconds);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo compact />
          <PmBadge
            tone="primary"
            className="hidden truncate uppercase tracking-wider sm:inline-flex"
          >
            {testName}
          </PmBadge>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              role="timer"
              aria-label="Time remaining"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors",
                tone === "danger"
                  ? "border-destructive/60 bg-destructive/15 text-destructive"
                  : tone === "warning"
                    ? "border-warning/50 bg-warning/10 text-warning"
                    : "border-border bg-surface text-foreground",
              )}
            >
              <Timer className="size-4" aria-hidden />
              <span className="hidden text-xs font-medium sm:inline">Time left</span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatClock(remainingSeconds)}
              </span>
            </div>
            <McqTimeAlert alert={timeAlert} onDismiss={onDismissTimeAlert} />
          </div>
          <div className="hidden items-center gap-2.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 sm:flex">
            <PmAvatar initials={initials} size="xs" />
            <span className="max-w-40 truncate text-sm font-semibold">{candidateName}</span>
          </div>
        </div>
      </div>
      <div className="flex h-12 items-center justify-between gap-3 border-t border-border bg-surface/70 px-4 lg:px-6">
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto" aria-label="Sections">
          {sections.map((s) => {
            const active = s.section === activeSection;
            return (
              <button
                key={s.section}
                type="button"
                onClick={() => onSectionChange(s.section)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary/15 text-primary-glow"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {sectionLabel(s.section)} ({s.indexes.length})
              </button>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {flaggedCount > 0 ? (
            <PmBadge tone="warning" className="hidden sm:inline-flex">
              <Flag className="size-3" /> Flagged ({flaggedCount})
            </PmBadge>
          ) : null}
          <PmButton variant="secondary" size="sm" onClick={onTogglePalette} className="xl:hidden">
            <LayoutGrid /> <span className="hidden md:inline">Question palette</span>
          </PmButton>
          <PmButton size="sm" onClick={onFinish}>
            Finish test
          </PmButton>
        </div>
      </div>
    </header>
  );
}
