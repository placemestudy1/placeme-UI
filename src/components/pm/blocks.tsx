import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock3, Hand, Mic, MicOff, Users, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Participant, Room, Session } from "@/lib/demo";
import { AvatarStack, PmAvatar, PmBadge, PmCard, StatusDot } from "./kit";

// Higher-level, domain-specific UI blocks (room cards, participant tiles,
// session rows, stat cards, progress chart, timer pill) built on top of the
// generic `kit.tsx` primitives.
//
// Exports:
// - ActionRow: an icon/title/subtitle link row, e.g. Home's Create Room /
//   Random Match / Join by Code entries.
// - RoomCard: a browsable/joinable room summary card.
// - ParticipantTile: a single participant's avatar/name/mic-status tile.
// - SessionRow: a past-session row for history lists.
// - StatCard: a small labeled stat tile with an optional delta.
// - ProgressPoint, ProgressChart: a simple bar chart of score-over-time
//   points.
// - TimerPill: a small pill showing an elapsed/remaining time string.

// Icon/title/subtitle link row used for a small set of top-level actions
// (e.g. Home's Create Room / Random Match / Join by Code entries).
export function ActionRow({
  icon: Icon,
  title,
  subtitle,
  to,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  to: string;
}) {
  return (
    <PmCard interactive className="p-4">
      <Link to={to} className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>
          ) : null}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </PmCard>
  );
}

// Card summarizing a room to browse/join: live/level badges, topic, host,
// duration, room code, and a filled/seats avatar stack. Navigates via `to`,
// or calls `onSelect(room)` instead when provided (see the BE-1 note below).
export function RoomCard({
  room,
  to = "/lobby",
  onSelect,
}: {
  room: Room;
  to?: string;
  // BE-1 (place-me-UI/docs/BACKEND_REQUIREMENTS.md): real open rooms have
  // nowhere fixed to navigate to (there's no per-room route to browse
  // into) -- callers with real data pass onSelect instead of `to`, e.g. to
  // prefill a join-code field. Fixture-data callers keep using `to`
  // unchanged.
  onSelect?: (room: Room) => void;
}) {
  const live = room.startsIn === "Live now";
  const content = (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PmBadge tone={live ? "live" : "neutral"}>
              {live ? <StatusDot status="live" /> : null}
              {room.startsIn}
            </PmBadge>
            <PmBadge>{room.level}</PmBadge>
          </div>
          <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug">{room.topic}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Hosted by {room.host} · {room.duration}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground">
          {room.code}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <AvatarStack items={["IR", "KB", "MN", "RS", "SQ"].slice(0, room.filled)} max={4} />
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="size-3.5" />
          {room.filled}/{room.seats} seats
        </span>
      </div>
    </>
  );
  return (
    <PmCard interactive className="p-5">
      {onSelect ? (
        <button type="button" onClick={() => onSelect(room)} className="block w-full text-left">
          {content}
        </button>
      ) : (
        <Link to={to} className="block">
          {content}
        </Link>
      )}
    </PmCard>
  );
}

// Tile showing one participant's avatar (with a speaking/muted ring), name,
// college, mic icon, and talk-share percentage. `compact` shrinks sizing for
// denser grids.
export function ParticipantTile({
  p,
  compact,
  dark,
}: {
  p: Participant;
  compact?: boolean;
  // Dark-background variant for the Live Session focus-mode screen — same
  // data/behavior, just legible on a navy background instead of a card.
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border p-4 text-center transition-colors",
        dark ? "border-white/10 bg-white/5" : "border-border bg-surface",
        p.speaking && (dark ? "border-success/60 bg-success/10" : "border-success/50 bg-success/5"),
        compact && "p-3",
      )}
    >
      <PmAvatar
        initials={p.initials}
        size={compact ? "md" : "lg"}
        ring={p.speaking ? "speaking" : p.muted ? "muted" : "none"}
      />
      <p className={cn("mt-2.5 w-full truncate text-sm font-semibold", dark && "text-white")}>
        {p.name}
      </p>
      <p
        className={cn(
          "w-full truncate text-[11px]",
          dark ? "text-white/50" : "text-muted-foreground",
        )}
      >
        {p.college}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        {p.handRaised && <Hand className="size-3.5 text-warning" />}
        {p.muted ? (
          <MicOff className={cn("size-3.5", dark ? "text-white/40" : "text-muted-foreground")} />
        ) : (
          <Mic
            className={cn(
              "size-3.5",
              p.speaking ? "text-success" : dark ? "text-white/40" : "text-muted-foreground",
            )}
          />
        )}
        <span className={cn("text-[11px]", dark ? "text-white/50" : "text-muted-foreground")}>
          {p.talkShare}%
        </span>
      </div>
    </div>
  );
}

// Row for a past session in a history list: topic, date/duration/participant
// count/code, and a status badge (Processing, or the numeric score/Analyzed).
// Links to `to` (typically the session's feedback/ended page).
export function SessionRow({
  s,
  to = "/ended",
  search,
}: {
  s: Session;
  to?: string;
  // Native's `/app/ended` is a flat route (no `$roomId` path segment like
  // the real web `/ended/$roomId`), so its callers identify the session via
  // a search param instead of baking the id into `to`.
  search?: Record<string, string>;
}) {
  return (
    <PmCard interactive className="p-4">
      <Link to={to} {...(search ? { search } : {})} className="flex items-center gap-4">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full border-2 font-display text-sm font-extrabold",
            s.score != null ? "border-primary text-primary" : "border-border text-muted-foreground",
          )}
        >
          {s.score ?? "—"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{s.topic}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {s.date} · {s.duration}
            {s.participants != null ? ` · ${s.participants} participants` : ""} · {s.code}
          </p>
        </div>
        {s.status === "Processing" ? (
          <PmBadge tone="warning" className="shrink-0">
            Processing
          </PmBadge>
        ) : s.score == null ? (
          <PmBadge tone="success" className="shrink-0">
            Analyzed
          </PmBadge>
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </Link>
    </PmCard>
  );
}

// Small stat tile: uppercase label, large value, and an optional delta line
// (e.g. "+4 this week").
export function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <PmCard className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {delta ? <p className="mt-1 text-[11px] text-accent">{delta}</p> : null}
    </PmCard>
  );
}

export type ProgressPoint = { label: string; score: number };

// Simple bar chart rendering a series of labeled score points (0-100) as
// vertical bars with the label underneath each bar.
export function ProgressChart({
  className,
  // BE-8 (place-me-UI/docs/BACKEND_REQUIREMENTS.md): real score history,
  // computed client-side from GET /api/history/mine per that item's own
  // suggested shape (a dedicated trend endpoint is only worth it "if
  // history grows large" -- not the case at pilot scale).
  series,
}: {
  className?: string;
  series: ProgressPoint[];
}) {
  const max = 100;
  return (
    <div className={cn("flex h-40 items-end gap-3", className)}>
      {series.map((p) => (
        <div key={p.label} className="flex h-full flex-1 flex-col items-center gap-2">
          <div className="relative w-full flex-1">
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-lg bg-[image:var(--gradient-primary)]"
              style={{ height: `${(p.score / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

// Small pill showing a monospaced clock icon + time string (defaults to a
// placeholder "08:14").
export function TimerPill({ time = "08:14" }: { time?: string | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-mono text-xs font-semibold">
      <Clock3 className="size-3.5 text-muted-foreground" />
      {time}
    </span>
  );
}
