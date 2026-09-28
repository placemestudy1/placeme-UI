import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export type TimeAlert = { kind: "warning"; text: string } | { kind: "timeout" };

interface McqTimeAlertProps {
  alert: TimeAlert | null;
  onDismiss: () => void;
}

// Time warning in the style of computer-based exams (NTA/TCS iON): a small,
// plain-text notice attached directly under the header timer -- "5 minutes
// remaining", "1 minute remaining", "30 seconds remaining", then "Time is
// up" while the answers are submitted. role="alert" so screen readers
// announce it without moving focus away from the question.
export function McqTimeAlert({ alert, onDismiss }: McqTimeAlertProps) {
  if (!alert) return null;
  const timeout = alert.kind === "timeout";
  return (
    <div
      role="alert"
      className={cn(
        "absolute right-0 top-full mt-2 flex w-max max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md border border-l-4 bg-card py-2 pl-3 pr-2 text-sm shadow-soft",
        timeout
          ? "border-destructive/40 border-l-destructive"
          : "border-warning/40 border-l-warning",
      )}
    >
      <span className="font-medium text-foreground">
        {timeout ? "Time is up. Submitting your answers…" : alert.text}
      </span>
      {!timeout ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
