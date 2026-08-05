// Shared date/time formatting helpers used by both web and mobile routes.
// Extracted from duplicated instances in index.tsx, history.tsx, app.index.tsx,
// app.history.tsx, session.$roomId.tsx, and app.session.tsx.
//
// Exports:
// - dateFormatter: "Jul 30, 6:30 PM" style for session row dates.
// - dateFormatterWithYear: "Jul 30, 2026, 6:30 PM" style for history.
// - monthFormatter: "July 2026" style for grouping sessions by month.
// - trendLabelFormatter: "Jul 30" style for score trend chart labels.
// - formatCountdown: formats remaining seconds as an "mm:ss" string.

/** Formats a date as "Jul 30, 6:30 PM" for session row display. */
export const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Formats a date as "Jul 30, 2026, 6:30 PM" for history with year. */
export const dateFormatterWithYear = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Formats a date as "July 2026" for grouping sessions by month. */
export const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});

/** Formats a date as "Jul 30" for score trend chart labels. */
export const trendLabelFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  day: "numeric",
});

/** Formats a remaining-seconds count as an "mm:ss" string for the timer pill. */
export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
