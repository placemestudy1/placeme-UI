import { FileText, X } from "lucide-react";

import { PmButton } from "@/components/pm/kit";
import { cn } from "@/lib/utils";
import { sectionLabel, type BankQuestion } from "@/lib/mcq/mcq-types";

interface McqPaperModalProps {
  open: boolean;
  onClose: () => void;
  section: string;
  /** [attempt index, question] pairs for the section */
  questions: [number, BankQuestion][];
  currentIndex: number;
  onJumpTo: (index: number) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function McqPaperModal({
  open,
  onClose,
  section,
  questions,
  currentIndex,
  onJumpTo,
}: McqPaperModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Question paper, ${sectionLabel(section)}`}
        className="rise relative z-10 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary-glow" />
            <h3 className="font-display text-lg font-semibold">
              Question paper · {sectionLabel(section)}
            </h3>
          </div>
          <PmButton variant="ghost" size="iconSm" onClick={onClose} aria-label="Close">
            <X />
          </PmButton>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto p-5">
          {questions.map(([index, q]) => {
            const isCurrent = index === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  onJumpTo(index);
                  onClose();
                }}
                className={cn(
                  "rounded-xl border-l-4 p-3 text-left transition-colors",
                  isCurrent
                    ? "border-primary bg-primary/10"
                    : "border-transparent bg-surface hover:bg-surface-raised",
                )}
              >
                <span className="font-mono text-xs font-bold text-primary-glow">
                  Q.{pad(index + 1)} {isCurrent ? "· current" : ""}
                </span>
                <p className="mt-1 line-clamp-3 text-sm">{q.stem}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
