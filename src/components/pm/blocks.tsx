import { Link } from "@tanstack/react-router";
import { Clock3, Hand, Mic, MicOff, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Participant, Room, Session } from "@/lib/demo";
import { AvatarStack, PmAvatar, PmBadge, PmCard, StatusDot } from "./kit";

// Higher-level, domain-specific UI blocks (room cards, participant tiles,
// session rows, stat cards, progress chart, timer pill) built on top of the
// generic `kit.tsx` primitives.
//
// Exports:
// - RoomCard: a browsable/joinable room summary card.
// - ParticipantTile: a single participant's avatar/name/mic-status tile.
// - SessionRow: a past-session row for history lists.
// - StatCard: a small labeled stat tile with an optional delta.
// - ProgressPoint, ProgressChart: a simple bar chart of score-over-time
//   points.
// - TimerPill: a small pill showing an elapsed/remaining time string.

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
            <PmBadge tone={live ? "live" : "primary"}>
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
export function ParticipantTile({ p, compact }: { p: Participant; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-border bg-surface p-4 text-center transition-colors",
        p.speaking && "border-success/50 bg-success/5",
        compact && "p-3",
      )}
    >
      <PmAvatar
        initials={p.initials}
        size={compact ? "md" : "lg"}
        ring={p.speaking ? "speaking" : p.muted ? "muted" : "none"}
      />
      <p className="mt-2.5 w-full truncate text-sm font-semibold">{p.name}</p>
      <p className="w-full truncate text-[11px] text-muted-foreground">{p.college}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {p.handRaised && <Hand className="size-3.5 text-warning" />}
        {p.muted ? (
          <MicOff className="size-3.5 text-muted-foreground" />
        ) : (
          <Mic className={cn("size-3.5", p.speaking ? "text-success" : "text-muted-foreground")} />
        )}
        <span className="text-[11px] text-muted-foreground">{p.talkShare}%</span>
      </div>
    </div>
  );
}

// Row for a past session in a history list: topic, date/duration/participant
// count/code, and a status badge (Processing, or the numeric score/Analyzed).
// Links to `to` (typically the session's feedback/ended page).
export function SessionRow({ s, to = "/ended" }: { s: Session; to?: string }) {
  return (
    <PmCard interactive className="p-4">
      <Link to={to} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{s.topic}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {s.date} · {s.duration}
            {s.participants != null ? ` · ${s.participants} participants` : ""} · {s.code}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {s.status === "Processing" ? (
            <PmBadge tone="warning">Processing</PmBadge>
          ) : s.score != null ? (
            <PmBadge tone="success">{s.score}</PmBadge>
          ) : (
            <PmBadge tone="success">Analyzed</PmBadge>
          )}
        </div>
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
