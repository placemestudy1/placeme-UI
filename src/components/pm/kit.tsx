import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Clock3,
  GitBranch,
  Info,
  Loader2,
  Mic,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Generic, app-wide UI component kit (buttons, inputs, cards, badges,
// avatars, dialogs, skeletons, transcript/feedback widgets) used to build
// the higher-level blocks in blocks.tsx and the page-level screens.
//
// Exports:
// - pmButtonVariants, PmButton: the styled button (variant/size/block) and
//   its cva class-variance definition.
// - Field, PmInput, PmTextarea, PmSelect: labeled form field wrapper and
//   styled input/textarea/select controls.
// - PmSegmented: pill-shaped segmented control for a small set of choices.
// - PmCard: generic bordered card container.
// - SectionTitle: a title/subtitle/action header for a page section.
// - PmBadge: small colored status/label pill.
// - StatusDot: a colored dot + label indicating live/speaking/muted/etc.
// - PmAvatar, AvatarStack: initials avatar, and an overlapping stack of them
//   with a "+N" overflow indicator.
// - Banner: a dismissible inline alert banner.
// - PmDialog: a centered/bottom-sheet modal dialog.
// - EmptyState, ErrorState: placeholder panels for empty and error states.
// - Skel, CardSkeleton: loading-skeleton primitives.
// - TranscriptLineItem, LiveCaption: a single transcript line, and a live
//   captions banner.
// - ScoreRing, DimensionCard, ScoreBar, FeedbackList: a circular score
//   gauge (also reusable as a countdown ring), an icon-labeled dimension
//   card, a labeled score progress bar, and a titled list of feedback
//   bullets.

/* ---------------------------------- Button --------------------------------- */

// cva class list for PmButton: variant (primary/secondary/outline/ghost/
// danger/live/accent), size (sm/md/lg/icon/iconSm/pill), and block (full
// width).
export const pmButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold cursor-pointer select-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-soft hover:brightness-110",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft",
        outline: "border border-border bg-transparent text-foreground hover:bg-secondary/60",
        ghost: "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        danger: "bg-destructive text-destructive-foreground hover:brightness-110 shadow-soft",
        live: "bg-live text-foreground hover:brightness-110 shadow-soft",
        accent: "bg-accent text-accent-foreground hover:brightness-105 shadow-soft",
      },
      size: {
        sm: "h-9 px-3.5 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-base",
        icon: "h-11 w-11",
        iconSm: "h-9 w-9",
        pill: "h-14 w-14 rounded-full",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface PmButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof pmButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

// Styled button supporting variant/size/block styling, an `asChild` mode
// (renders via Radix Slot onto its child instead of a <button>), and a
// `loading` state that swaps in a spinner before the children.
export const PmButton = React.forwardRef<HTMLButtonElement, PmButtonProps>(
  ({ className, variant, size, block, asChild, loading, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(pmButtonVariants({ variant, size, block, className }))}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" /> {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
PmButton.displayName = "PmButton";

/* ---------------------------------- Input ---------------------------------- */

// Labeled form field wrapper: renders an optional uppercase label above
// `children`, and an error message (or hint text) below it.
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// Styled text input, with an optional leading icon.
export const PmInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }
>(({ className, icon, ...props }, ref) => (
  <div className="relative">
    {icon ? (
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
    ) : null}
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-xl border border-input bg-surface px-4 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25",
        icon && "pl-11",
        className,
      )}
      {...props}
    />
  </div>
));
PmInput.displayName = "PmInput";

// Styled textarea.
export const PmTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-xl border border-input bg-surface p-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25",
      className,
    )}
    {...props}
  />
));
PmTextarea.displayName = "PmTextarea";

// Styled native <select>.
export function PmSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-12 w-full appearance-none rounded-xl border border-input bg-surface px-4 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// Pill-shaped segmented control for a small set of mutually-exclusive
// choices (e.g. duration/level/visibility pickers) — the active option is
// filled, others are outlined.
export function PmSegmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors [&_svg]:size-3.5",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground hover:bg-secondary/60",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------- Card ---------------------------------- */

// Generic bordered card container; `glass` swaps to a translucent glass
// background, `interactive` adds hover lift/glow styling for clickable cards.
export function PmCard({
  className,
  interactive,
  glass,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; glass?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border shadow-soft",
        glass ? "glass" : "bg-card",
        interactive &&
          "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow",
        className,
      )}
      {...props}
    />
  );
}

// Section header: a title (with optional subtitle) and an optional
// right-aligned action element (e.g. a button or link).
export function SectionTitle({
  title,
  action,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

// cva class list for PmBadge's color tones (neutral/primary/accent/success/
// warning/danger/live).
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
  {
    variants: {
      tone: {
        neutral: "border-border bg-secondary text-muted-foreground",
        primary: "border-primary/30 bg-primary/15 text-primary-glow",
        accent: "border-accent/30 bg-accent/15 text-accent",
        success: "border-success/30 bg-success/15 text-success",
        warning: "border-warning/30 bg-warning/15 text-warning",
        danger: "border-destructive/30 bg-destructive/15 text-destructive",
        live: "border-live/40 bg-live/15 text-live",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

// Small pill-shaped status/label badge, colored by `tone`.
export function PmBadge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/* ------------------------------ Status indicator --------------------------- */

// Small colored dot (live/speaking/muted/idle/connecting) with an optional
// text label, used as a compact status indicator.
export function StatusDot({
  status = "idle",
  label,
  className,
}: {
  status?: "live" | "speaking" | "muted" | "idle" | "connecting";
  label?: string;
  className?: string;
}) {
  const map = {
    live: "bg-live pulse-ring",
    speaking: "bg-success",
    muted: "bg-muted-foreground",
    idle: "bg-muted-foreground/60",
    connecting: "bg-warning animate-pulse",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-medium", className)}>
      <span className={cn("size-2 rounded-full", map[status])} />
      {label}
    </span>
  );
}

/* ---------------------------------- Avatar --------------------------------- */

const avatarSizes = {
  xs: "size-7 text-[10px]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
} as const;

// Circular initials avatar; `size` controls diameter/font-size and `ring`
// adds a speaking (green ring) or muted (dimmed) treatment.
export function PmAvatar({
  initials,
  size = "md",
  ring,
  className,
}: {
  initials: string;
  size?: keyof typeof avatarSizes;
  ring?: "speaking" | "muted" | "none";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-[image:var(--gradient-primary)] font-bold text-primary-foreground",
        avatarSizes[size],
        ring === "speaking" && "ring-2 ring-success ring-offset-2 ring-offset-background",
        ring === "muted" && "opacity-70 ring-1 ring-border",
        className,
      )}
    >
      {initials}
    </span>
  );
}

// Overlapping stack of small PmAvatars for a list of initials, showing at
// most `max` and a "+N" badge for any remainder.
export function AvatarStack({ items, max = 4 }: { items: string[]; max?: number }) {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((i) => (
        <PmAvatar key={i} initials={i} size="sm" className="ring-2 ring-background" />
      ))}
      {rest > 0 ? (
        <span className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground ring-2 ring-background">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

/* ---------------------------------- Banner --------------------------------- */

// Inline alert banner (info/success/warning/danger) with a title, optional
// description and action, and an optional dismiss button.
export function Banner({
  tone = "info",
  title,
  description,
  action,
  onDismiss,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title: string;
  description?: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
}) {
  const tones = {
    info: "border-primary/30 bg-primary/10 text-primary-glow",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
  } as const;
  const Icon = tone === "info" ? Info : tone === "success" ? Check : AlertTriangle;
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border p-4", tones[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/* --------------------------------- Dialog ---------------------------------- */

// Modal dialog: centered on desktop or, with `sheetOnMobile`, a bottom sheet
// on small screens. Renders nothing when `open` is false. Backdrop click and
// `onClose` both dismiss it (dismissal is the caller's responsibility via
// the `open` prop).
export function PmDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  sheetOnMobile,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  sheetOnMobile?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "rise relative z-10 w-full max-w-md border border-border bg-card p-6 shadow-soft",
          sheetOnMobile ? "rounded-t-3xl sm:rounded-3xl" : "m-4 rounded-3xl",
        )}
      >
        {sheetOnMobile ? (
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border sm:hidden" />
        ) : null}
        <h3 className="text-lg font-bold">{title}</h3>
        {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
        {children ? <div className="mt-5">{children}</div> : null}
        {footer ? <div className="mt-6 flex gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------- Empty / Error ------------------------------ */

// Placeholder panel for an empty list/section: icon, title, optional
// description and action.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-muted-foreground [&_svg]:size-6">
        {icon}
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

// Placeholder panel for a failed load: title, description, and an optional
// "Try again" button wired to `onRetry`.
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Check your connection and try again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-destructive/25 bg-destructive/8 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <PmButton variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </PmButton>
      ) : null}
    </div>
  );
}

/* -------------------------------- Skeletons -------------------------------- */

// Single pulsing skeleton block; size/shape controlled entirely by
// `className`.
export function Skel({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-secondary/80", className)} />;
}

// Loading placeholder shaped like a typical card (avatar + two lines of
// header text, plus two body lines), for use while real content loads.
export function CardSkeleton() {
  return (
    <PmCard className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Skel className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skel className="h-3 w-1/2" />
          <Skel className="h-3 w-1/3" />
        </div>
      </div>
      <Skel className="h-3 w-full" />
      <Skel className="h-3 w-4/5" />
    </PmCard>
  );
}

/* -------------------------------- Transcript ------------------------------- */

// A single transcript entry: speaker avatar, name, timestamp, optional tag
// badge (Strong point/Interruption/filler), and the spoken text bubble.
// `self` highlights the current user's own lines.
export function TranscriptLineItem({
  speaker,
  initials,
  time,
  text,
  tag,
  self,
}: {
  speaker: string;
  initials: string;
  time: string;
  text: string;
  tag?: string;
  self?: boolean;
}) {
  const tone = tag === "Strong point" ? "success" : tag === "Interruption" ? "warning" : "danger";
  return (
    <div className="flex gap-3">
      <PmAvatar initials={initials} size="sm" className={self ? "" : "opacity-90"} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{speaker}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{time}</span>
          {tag ? <PmBadge tone={tone as never}>{tag}</PmBadge> : null}
        </div>
        <p
          className={cn(
            "mt-1.5 rounded-2xl border border-border/70 p-3 text-sm leading-relaxed text-muted-foreground",
            self ? "bg-primary/10 text-foreground" : "bg-surface",
          )}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

// Glass-styled banner showing the latest live caption text during a session.
export function LiveCaption({ text }: { text: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
        Live captions
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/* -------------------------------- Feedback --------------------------------- */

// Circular gauge showing a score (out of `max`, default 100) as a
// proportionally-filled ring. Shows the numeric score in the center by
// default; pass `valueLabel`/`label` to repurpose it (e.g. a countdown
// ring showing "6:42" instead), and `tone="light"` for use on a dark
// background (the Live Session screen).
export function ScoreRing({
  score,
  max = 100,
  size = 132,
  strokeWidth = 9,
  label = "score",
  valueLabel,
  tone = "primary",
}: {
  score: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  valueLabel?: string;
  tone?: "primary" | "light";
}) {
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const light = tone === "light";
  // Text scales with the ring's diameter (not a fixed text-3xl) so small
  // rings — e.g. the Live Session countdown — don't overflow their circle;
  // a longer valueLabel (like "06:41") gets a further size trim.
  const displayValue = valueLabel ?? String(score);
  const fontSize = Math.max(9, size * (displayValue.length > 3 ? 0.19 : 0.24));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          className={cn("fill-none", light ? "stroke-white/20" : "stroke-secondary")}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0, Math.min(1, score / max)) * c} ${c}`}
          className={cn("fill-none", light ? "stroke-white" : "stroke-primary")}
        />
      </svg>
      <div className="absolute text-center">
        <p
          className={cn("font-display font-bold leading-none", light && "text-white")}
          style={{ fontSize }}
        >
          {displayValue}
        </p>
        {label ? (
          <p
            className={cn(
              "mt-1 text-[10px] uppercase tracking-widest",
              light ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {label}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// Maps a feedback dimension's free-form label to a representative icon via
// keyword lookup (backend labels aren't a closed enum), falling back to a
// generic sparkle icon for anything unrecognized.
const DIMENSION_ICONS: { keywords: string[]; icon: typeof Mic }[] = [
  { keywords: ["clarity", "speech", "articulation"], icon: Mic },
  { keywords: ["argument", "structure", "logic", "reasoning"], icon: GitBranch },
  { keywords: ["confidence", "delivery", "presence"], icon: Zap },
  { keywords: ["engagement", "participation", "collaboration"], icon: Users },
  { keywords: ["time", "pace", "pacing"], icon: Clock3 },
  { keywords: ["vocabulary", "language", "word"], icon: BookOpen },
];

function iconForDimension(label: string) {
  const l = label.toLowerCase();
  return DIMENSION_ICONS.find((d) => d.keywords.some((k) => l.includes(k)))?.icon ?? Sparkles;
}

// Icon-labeled feedback-dimension card: keyword-matched icon, a thin score
// bar, and the numeric score, for the Feedback screen's dimension grid.
// `score` is treated as 0-100, matching ScoreBar's existing convention.
export function DimensionCard({
  label,
  score,
  note,
}: {
  label: string;
  score: number;
  note?: string;
}) {
  const Icon = iconForDimension(label);
  return (
    <PmCard className="p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="truncate text-sm font-semibold">{label}</span>
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          />
        </div>
        <span className="font-mono text-sm font-bold text-primary">{score}</span>
      </div>
      {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
    </PmCard>
  );
}

// Labeled horizontal progress bar for a single 0-100 feedback dimension
// score, with an optional note underneath.
export function ScoreBar({ label, score, note }: { label: string; score: number; note?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm text-muted-foreground">{score}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-[image:var(--gradient-primary)]"
          style={{ width: `${score}%` }}
        />
      </div>
      {note ? <p className="mt-1.5 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

// Card listing feedback bullets (e.g. strengths or improvements) under a
// titled header with a colored dot (`tone`: success/warning).
export function FeedbackList({
  title,
  items,
  tone = "success",
}: {
  title: string;
  items: string[];
  tone?: "success" | "warning";
}) {
  return (
    <PmCard className="p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold">
        <span
          className={cn("size-2 rounded-full", tone === "success" ? "bg-success" : "bg-warning")}
        />
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <span className={cn("mt-2 size-1 shrink-0 rounded-full bg-muted-foreground")} />
            {i}
          </li>
        ))}
      </ul>
    </PmCard>
  );
}
