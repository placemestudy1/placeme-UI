import { Link } from "@tanstack/react-router";
import { Clock3, Hand, Mic, MicOff, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Participant, Room, Session } from "@/lib/demo";
import { AvatarStack, PmAvatar, PmBadge, PmCard, StatusDot } from "./kit";

// Higher-level, domain-specific UI blocks (room cards, participant tiles,
// session rows, stat cards, score heatmap, timer pill) built on top of the
// generic `kit.tsx` primitives.
//
// Exports:
// - RoomCard: a browsable/joinable room summary card.
// - ParticipantTile: a single participant's avatar/name/mic-status tile.
// - SessionRow: a past-session row for history lists.
// - StatCard: a small labeled stat tile with an optional delta.
// - HeatmapDay, ScoreHeatmap: a GitHub-contributions style one-box-per-day
//   heatmap of the last few months' scores.
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

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export type HeatmapDay = {
  date: Date;
  day: number;
  /** Monday-first: 0 = Mon ... 6 = Sun. */
  weekday: number;
  sessions: number;
  /** Average score of the day's scored sessions, or null if none. */
  score: number | null;
  level: HeatmapLevel;
  isToday: boolean;
  isFuture: boolean;
};

// Box fill per intensity level: level 0 (no sessions) is an unfilled neutral
// box, and fill strengthens as the day's average score rises. Future
// days are dimmed further so they read as "not yet" rather than "missed".
const heatmapLevelClass: Record<HeatmapLevel, string> = {
  0: "bg-secondary",
  1: "bg-primary/25",
  2: "bg-primary/45",
  3: "bg-primary/70",
  4: "bg-primary",
};

const heatmapDayFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

// Second line of a box's hover tooltip: the day's score, or why there isn't one.
function heatmapDayDetail(d: HeatmapDay): string {
  if (d.isFuture) return "Upcoming";
  if (d.sessions === 0) return "No session";
  return d.score == null ? "Not scored yet" : `Score ${d.score}`;
}

const heatmapMonthFormatter = new Intl.DateTimeFormat("en-IN", { month: "short" });

// Row labels for every weekday, Monday first to match HeatmapDay.weekday.
const heatmapWeekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// GitHub-contributions style heatmap: rows are weekdays (Mon at top, each
// labelled), columns are weeks, month names sit above the week each month
// starts in, and box intensity is the day's average score. Boxes size
// themselves to fill the card's width; hovering one shows its date and score.
export function ScoreHeatmap({ className, days }: { className?: string; days: HeatmapDay[] }) {
  const lead = days[0]?.weekday ?? 0;
  const weeks = Math.ceil((lead + days.length) / 7);
  const weekOf = (i: number) => Math.floor((lead + i) / 7);
  const monthStarts = days.flatMap((d, i) =>
    d.day === 1 ? [{ label: heatmapMonthFormatter.format(d.date), week: weekOf(i) }] : [],
  );
  return (
    <TooltipProvider delayDuration={50}>
      <div className={cn("w-fit max-w-full space-y-3", className)}>
        <div
          className="grid items-center justify-start gap-[3px] text-[10px] text-muted-foreground"
          // Boxes fill the card but cap at 18px, so a full-width card (sidebar
          // stacked under the main column on narrower screens) stays compact.
          style={{ gridTemplateColumns: `auto repeat(${weeks}, minmax(0, 1.125rem))` }}
        >
          {monthStarts.map((m) => (
            <span
              // Each month starts in a different week, so unlike the label this
              // stays unique however many months are shown.
              key={m.week}
              className="whitespace-nowrap pb-0.5"
              style={{ gridRow: 1, gridColumn: `${m.week + 2} / span 3` }}
            >
              {m.label}
            </span>
          ))}
          {heatmapWeekdayLabels.map((label, row) => (
            <span
              key={label}
              className="pr-1.5 leading-none"
              style={{ gridRow: row + 2, gridColumn: 1 }}
            >
              {label}
            </span>
          ))}
          <ul className="contents">
            {days.map((d, i) => {
              const date = heatmapDayFormatter.format(d.date);
              const detail = heatmapDayDetail(d);
              return (
                <Tooltip key={d.date.getTime()}>
                  <TooltipTrigger asChild>
                    <li
                      aria-label={`${date} · ${detail}`}
                      data-level={d.level}
                      className={cn(
                        "aspect-square rounded-[3px] transition-transform hover:scale-125",
                        d.isFuture ? "bg-secondary/40" : heatmapLevelClass[d.level],
                        d.isToday && "ring-1 ring-foreground/50",
                      )}
                      style={{ gridRow: d.weekday + 2, gridColumn: weekOf(i) + 2 }}
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="border border-border bg-popover px-2.5 py-1.5 text-popover-foreground"
                  >
                    <p className="font-semibold">{date}</p>
                    <p className="text-muted-foreground">{detail}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </ul>
        </div>
        <div
          className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground"
          aria-hidden
        >
          <span className="mr-0.5">Less</span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className={cn("size-2.5 rounded-[3px]", heatmapLevelClass[l])} />
          ))}
          <span className="ml-0.5">More</span>
        </div>
      </div>
    </TooltipProvider>
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
