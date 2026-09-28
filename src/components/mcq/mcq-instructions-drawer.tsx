import { BookOpen, X } from "lucide-react";

import { PmButton } from "@/components/pm/kit";
import { cn } from "@/lib/utils";

interface McqInstructionsDrawerProps {
  open: boolean;
  onClose: () => void;
}

// What the test actually does (SPEC-0017): count-correct scoring, a
// server-owned clock, auto-save and auto-submit. No proctoring claims.
const RULES = [
  {
    title: "Scoring",
    body: "Each correct answer scores 1. Wrong and unanswered questions score 0, so it's always worth answering.",
  },
  {
    title: "Timer",
    body: "The clock keeps running if you close or refresh the tab. When it reaches zero your test is submitted automatically.",
  },
  {
    title: "Saving",
    body: "Your answers save on this device as you go and sync every minute, so you can refresh or come back on another device and pick up where you left off.",
  },
  {
    title: "Results",
    body: "After you submit you'll see your score by section and topic, the correct answers with explanations, and the time you spent on each question.",
  },
];

export function McqInstructionsDrawer({ open, onClose }: McqInstructionsDrawerProps) {
  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Test instructions"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col gap-5 overflow-y-auto border-l border-border bg-card p-6 shadow-soft transition-transform duration-300 sm:w-96",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary-glow" />
            <h3 className="font-display text-lg font-semibold">How this test works</h3>
          </div>
          <PmButton variant="ghost" size="iconSm" onClick={onClose} aria-label="Close">
            <X />
          </PmButton>
        </div>
        <div className="flex flex-col gap-3">
          {RULES.map((r) => (
            <div key={r.title} className="rounded-xl border border-border bg-surface p-4">
              <h4 className="text-sm font-semibold">{r.title}</h4>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </div>
          ))}
        </div>
        <PmButton block onClick={onClose} className="mt-auto">
          Back to the test
        </PmButton>
      </aside>
    </>
  );
}
