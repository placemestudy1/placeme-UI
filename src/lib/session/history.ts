// Shared history helpers for building score trend data and converting
// backend HistorySession records into the UI's Session shape.
//
// Exports:
// - MAX_TREND_POINTS: cap on how many trend points to show.
// - buildScoreTrend: builds a ProgressPoint[] from scored HistorySession[].
// - toSessionRow: converts a HistorySession to the UI Session shape.

import type { HistorySession } from "@/lib/api";
import type { Session } from "@/lib/demo";
import type { ProgressPoint } from "@/components/pm/blocks";
import { trendLabelFormatter } from "./formatting";

/** Maximum number of scored sessions to include in the trend chart. */
export const MAX_TREND_POINTS = 8;

/**
 * Builds a ProgressPoint[] from actually-scored sessions, chronological,
 * capped at MAX_TREND_POINTS so the chart stays readable rather than trying
 * to bucket by week — at pilot scale a student may have very few sessions,
 * and fake weekly gaps would be more misleading than a plain "last N scored
 * sessions" line.
 */
export function buildScoreTrend(sessions: HistorySession[]): ProgressPoint[] {
  return sessions
    .filter(
      (s): s is HistorySession & { score: number; startedAt: string } =>
        s.score != null && s.startedAt != null,
    )
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .slice(-MAX_TREND_POINTS)
    .map((s) => ({ label: trendLabelFormatter.format(new Date(s.startedAt)), score: s.score }));
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
