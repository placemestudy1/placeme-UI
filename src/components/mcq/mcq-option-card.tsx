import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { OPTION_LABELS } from "@/lib/mcq/mcq-types";

interface McqOptionCardProps {
  questionId: string;
  index: number;
  text: string;
  selected: boolean;
  onSelect: (index: number) => void;
}

// One answer option as a real radio input (keyboard and screen-reader
// accessible) styled as a card.
export function McqOptionCard({ questionId, index, text, selected, onSelect }: McqOptionCardProps) {
  const label = OPTION_LABELS[index] ?? String(index + 1);
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition-all duration-200",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        selected
          ? "border-primary/50 bg-primary/10 shadow-glow"
          : "border-border bg-surface hover:border-primary/30 hover:bg-surface-raised",
      )}
    >
      <span className="flex min-w-0 items-center gap-4">
        <input
          type="radio"
          name={`answer-${questionId}`}
          className="sr-only"
          value={index}
          checked={selected}
          onChange={() => onSelect(index)}
        />
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl font-mono text-sm font-bold transition-colors",
            selected
              ? "bg-[image:var(--gradient-primary)] text-primary-foreground"
              : "bg-secondary text-muted-foreground group-hover:text-foreground",
          )}
        >
          {label}
        </span>
        <span className={cn("text-base", selected && "font-semibold")}>{text}</span>
        {selected ? (
          <span className="hidden items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary-glow sm:inline-flex">
            <Check className="size-3.5" /> Selected
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs",
          selected ? "bg-primary/15 text-primary-glow" : "bg-secondary text-muted-foreground",
        )}
        aria-hidden
      >
        [{index + 1}]
      </span>
    </label>
  );
}
