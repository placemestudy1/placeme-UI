import { AlertTriangle } from "lucide-react";

import { PmButton, PmDialog } from "@/components/pm/kit";

interface McqSubmitModalProps {
  open: boolean;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  stats: { answered: number; flagged: number; notVisited: number; total: number };
}

export function McqSubmitModal({
  open,
  submitting,
  error,
  onCancel,
  onConfirm,
  stats,
}: McqSubmitModalProps) {
  const unanswered = stats.total - stats.answered;
  return (
    <PmDialog
      open={open}
      onClose={submitting ? () => {} : onCancel}
      title="Finish this test?"
      description="Your answers are scored as soon as you submit. You can't change them afterwards."
      footer={
        <>
          <PmButton variant="secondary" block onClick={onCancel} disabled={submitting}>
            Keep going
          </PmButton>
          <PmButton block onClick={onConfirm} loading={submitting} disabled={submitting}>
            Submit test
          </PmButton>
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-3 font-mono text-sm">
        {[
          ["Total questions", stats.total, "text-foreground"],
          ["Answered", stats.answered, "text-accent"],
          ["Flagged for review", stats.flagged, "text-warning"],
          ["Not visited", stats.notVisited, "text-muted-foreground"],
        ].map(([label, value, tone]) => (
          <div key={label as string} className="rounded-xl border border-border bg-surface p-3">
            <dt className="font-sans text-xs text-muted-foreground">{label}</dt>
            <dd className={`mt-1 text-lg font-bold ${tone as string}`}>{value}</dd>
          </div>
        ))}
      </dl>
      {unanswered > 0 ? (
        <p className="mt-4 flex items-start gap-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {unanswered} {unanswered === 1 ? "question is" : "questions are"} unanswered. Unanswered
          questions score 0.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </PmDialog>
  );
}
