// Shared statistical helpers for session data, used by both the web and
// mobile routes. Extracted from duplicated copies in index.tsx, history.tsx,
// app.index.tsx, and app.history.tsx.
//
// Exports:
// - average: returns the rounded mean of an array of numbers, or null if empty.
// - computeStreak: returns the current consecutive-calendar-day practice
//   streak using standard habit-tracker semantics.

import type { HistorySession } from "@/lib/api";

/** Returns the rounded mean of `values`, or null if the array is empty. */
export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * "Current streak" = consecutive calendar days with at least one ended
 * session, still counted as active through the end of the day after the
 * most recent practiced day (standard habit-tracker semantics).
 */
export function computeStreak(sessions: HistorySession[]): number {
  const practicedDays = new Set(
    sessions
      .filter((s) => s.status === "ended" && s.startedAt)
      .map((s) => new Date(s.startedAt as string).toDateString()),
  );
  function streakFrom(start: Date): number {
    let count = 0;
    const cursor = new Date(start);
    while (practicedDays.has(cursor.toDateString())) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }
  const today = new Date();
  const fromToday = streakFrom(today);
  if (fromToday > 0) return fromToday;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return streakFrom(yesterday);
}
