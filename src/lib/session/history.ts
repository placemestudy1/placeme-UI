// Shared history helpers for building score heatmap data and converting
// backend HistorySession records into the UI's Session shape.
//
// Exports:
// - realSessionsOnly: drops rooms cancelled before they ever started.
// - scoreLevel: buckets a 0-100 score into a heatmap intensity level.
// - HEATMAP_MONTHS: how many months (current included) the score heatmap covers.
// - buildHeatmap: one HeatmapDay per day of the last HEATMAP_MONTHS months.
// - toSessionRow: converts a HistorySession to the UI Session shape.

import type { HistorySession } from "@/lib/api";
import type { Session } from "@/lib/demo";
import type { HeatmapDay, HeatmapLevel } from "@/components/pm/blocks";

/**
 * Filters out rooms that were cancelled before they ever started (SCRUM-26:
 * a creator-cancelled or expired waiting room, end_reason
 * 'cancelled_by_creator'/'cancelled_expired') so History shows only real,
 * actually-held discussions (SCRUM-27 OUTCOME: "only real sessions"). A
 * room that truly ran always has startedAt set by the start call; one
 * cancelled straight out of `waiting` never does -- that's the one signal
 * this endpoint already exposes that reliably tells the two apart, without
 * needing end_reason itself in the History contract.
 */
export function realSessionsOnly(
  sessions: HistorySession[],
): (HistorySession & { startedAt: string })[] {
  return sessions.filter((s): s is HistorySession & { startedAt: string } => s.startedAt != null);
}

/**
 * GitHub-contributions style, but by score: the higher the day's average
 * score, the stronger the box. Levels 1-4 map to <40, 40-59, 60-79 and 80+;
 * level 0 (no fill) is for days with no score: no session, or one still
 * being scored.
 */
export function scoreLevel(score: number): Exclude<HeatmapLevel, 0> {
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

/** Months the score heatmap covers, current month included (Jul-Sep in Sep). */
export const HEATMAP_MONTHS = 3;

/**
 * Builds one HeatmapDay per calendar day from the 1st of the month
 * `months - 1` months before `today` through the last day of today's month
 * (days after today come back flagged isFuture), bucketing held sessions by
 * the student's local date. Intensity comes from the average score of that
 * day's scored sessions. A day with only unscored sessions (feedback still
 * processing) stays at level 0. ScoreHeatmap marks it separately (sessions > 0,
 * score null) so it doesn't read as a low score.
 */
export function buildHeatmap(
  sessions: HistorySession[],
  today: Date = new Date(),
  months: number = HEATMAP_MONTHS,
): HeatmapDay[] {
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const byDay = new Map<string, { count: number; scores: number[] }>();
  for (const s of sessions) {
    if (s.startedAt == null) continue;
    const d = new Date(s.startedAt);
    const entry = byDay.get(dayKey(d)) ?? { count: 0, scores: [] };
    entry.count += 1;
    if (s.score != null) entry.scores.push(s.score);
    byDay.set(dayKey(d), entry);
  }

  const days: HeatmapDay[] = [];
  // Stepping by calendar day (not +24h) keeps DST changes from skipping days.
  for (let date = start; date <= end;) {
    const entry = byDay.get(dayKey(date));
    const score = entry?.scores.length
      ? Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
      : null;
    days.push({
      date,
      day: date.getDate(),
      // Monday-first: 0 = Mon ... 6 = Sun.
      weekday: (date.getDay() + 6) % 7,
      sessions: entry?.count ?? 0,
      score,
      level: score == null ? 0 : scoreLevel(score),
      isToday: date.getTime() === todayStart,
      isFuture: date.getTime() > todayStart,
    });
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }
  return days;
}

/**
 * Converts a backend HistorySession into the UI Session shape for SessionRow.
 * Accepts a date formatter so callers can choose with/without year.
 */
export function toSessionRow(s: HistorySession, formatter: Intl.DateTimeFormat): Session {
  return {
    id: s.id,
    topic: s.topicText ?? "Untitled discussion",
    date: s.startedAt ? formatter.format(new Date(s.startedAt)) : "Not started yet",
    duration: `${Math.round(s.durationSeconds / 60)} min`,
    code: s.code,
    // BE-19: real score once BE-6/BE-7 has produced one — "Analyzed" is
    // now only a genuine fallback (feedback generated, score not, e.g. a
    // pre-migration row), not the everyday case.
    score: s.score ?? undefined,
    status: s.status === "ended" && s.feedback ? "Analyzed" : "Processing",
  };
}
