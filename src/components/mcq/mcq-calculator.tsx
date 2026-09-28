import { useState } from "react";
import { Calculator, X } from "lucide-react";

import { PmButton } from "@/components/pm/kit";
import { cn } from "@/lib/utils";

interface McqCalculatorProps {
  open: boolean;
  onClose: () => void;
}

const KEYS = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "C", "0", ".", "+"];
const OPS = new Set(["/", "*", "-", "+"]);
const SHOW: Record<string, string> = { "/": "÷", "*": "×", "-": "−" };

export function McqCalculator({ open, onClose }: McqCalculatorProps) {
  const [expr, setExpr] = useState("");
  const [hasError, setHasError] = useState(false);

  if (!open) return null;

  function press(key: string) {
    if (key === "C") {
      setExpr("");
      setHasError(false);
    } else if (hasError) {
      setExpr(key);
      setHasError(false);
    } else {
      setExpr((prev) => prev + key);
    }
  }

  function evaluate() {
    if (!expr) return;
    try {
      // Only the keypad above can build `expr`: digits, ".", and + - * /.
      const res = new Function(`return (${expr})`)() as unknown;
      if (typeof res !== "number" || !Number.isFinite(res)) throw new Error("Invalid");
      setExpr(String(Math.round(res * 1e10) / 1e10));
      setHasError(false);
    } catch {
      setExpr("Error");
      setHasError(true);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Calculator"
      className="rise fixed bottom-20 right-4 z-50 flex w-72 flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft lg:right-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="size-4 text-primary-glow" /> Calculator
        </div>
        <PmButton variant="ghost" size="iconSm" onClick={onClose} aria-label="Close calculator">
          <X />
        </PmButton>
      </div>
      <output className="min-h-11 overflow-hidden rounded-xl border border-border bg-surface px-3 py-2.5 text-right font-mono text-lg">
        {expr || "0"}
      </output>
      <div className="grid grid-cols-4 gap-1.5 font-mono text-sm">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className={cn(
              "h-10 rounded-lg font-semibold transition-colors",
              key === "C"
                ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                : OPS.has(key)
                  ? "bg-primary/15 text-primary-glow hover:bg-primary/25"
                  : "bg-secondary text-foreground hover:bg-secondary/70",
            )}
          >
            {SHOW[key] ?? key}
          </button>
        ))}
        <button
          type="button"
          onClick={evaluate}
          className="col-span-4 h-10 rounded-lg bg-[image:var(--gradient-primary)] font-bold text-primary-foreground hover:brightness-110"
        >
          =
        </button>
      </div>
    </div>
  );
}
