import { describe, expect, it } from "vitest";

import type { HistorySession } from "@/lib/api";
import { buildHeatmap, realSessionsOnly, scoreLevel } from "./history";

function fakeSession(overrides: Partial<HistorySession> = {}): HistorySession {
  return {
    id: "s1",
    code: "GD-1111",
    status: "ended",
    durationSeconds: 900,
    topicText: "Topic",
    startedAt: "2026-07-01T10:00:00.000Z",
    endedAt: "2026-07-01T10:15:00.000Z",
    feedback: null,
    score: null,
    dimensions: [],
    strengths: [],
    improvements: [],
    talkShare: null,
    ...overrides,
  };
}

describe("realSessionsOnly (SCRUM-27 valid-history filtering)", () => {
  it("keeps a room that actually started", () => {
    const real = fakeSession({ id: "real" });
    expect(realSessionsOnly([real])).toEqual([real]);
  });

  it("drops a room cancelled before it ever started (SCRUM-26: startedAt stays null)", () => {
    const cancelled = fakeSession({
      id: "cancelled",
      startedAt: null,
      endedAt: "2026-07-01T10:15:00.000Z",
    });
    expect(realSessionsOnly([cancelled])).toEqual([]);
  });

  it("filters a mixed list down to only the real sessions", () => {
    const real = fakeSession({ id: "real" });
    const cancelled = fakeSession({ id: "cancelled", startedAt: null });
    expect(realSessionsOnly([real, cancelled]).map((s) => s.id)).toEqual(["real"]);
  });

  it("returns an empty array for an all-cancelled history", () => {
    const cancelled = fakeSession({ id: "cancelled", startedAt: null });
    expect(realSessionsOnly([cancelled])).toEqual([]);
  });
});

// Local-time timestamps so day bucketing is checked the way a student sees it,
// whatever timezone the test runner is in.
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m, d, h).toISOString();

describe("buildHeatmap", () => {
  const today = new Date(2026, 8, 26, 12); // 26 Sep 2026

  it("covers the current month and the two before it, one box per day", () => {
    const days = buildHeatmap([], today);
    expect(days).toHaveLength(31 + 31 + 30); // Jul + Aug + Sep
    expect(days[0]?.date).toEqual(new Date(2026, 6, 1));
    expect(days.at(-1)?.date).toEqual(new Date(2026, 8, 30));
  });

  it("spans a year boundary", () => {
    const days = buildHeatmap([], new Date(2027, 0, 15));
    expect(days).toHaveLength(30 + 31 + 31); // Nov + Dec + Jan
    expect(days[0]?.date).toEqual(new Date(2026, 10, 1));
    expect(days.at(-1)?.date).toEqual(new Date(2027, 0, 31));
  });

  it("gives Monday-first weekdays", () => {
    const days = buildHeatmap([], today);
    // 1 Jul 2026 is a Wednesday; 5 Jul is a Sunday.
    expect(days[0]).toMatchObject({ day: 1, weekday: 2 });
    expect(days[4]).toMatchObject({ day: 5, weekday: 6 });
  });

  it("marks days after today as future", () => {
    const days = buildHeatmap([], today);
    const sep = days.slice(62);
    expect(sep[25]).toMatchObject({ day: 26, isFuture: false, isToday: true });
    expect(sep[26]).toMatchObject({ day: 27, isFuture: true, isToday: false });
  });

  it("averages the scores of every session held that day", () => {
    const days = buildHeatmap(
      [
        fakeSession({ id: "a", startedAt: at(2026, 7, 8, 9), score: 70 }),
        fakeSession({ id: "b", startedAt: at(2026, 7, 8, 18), score: 90 }),
      ],
      today,
    );
    expect(days[31 + 7]).toMatchObject({ day: 8, sessions: 2, score: 80, level: 4 });
  });

  it("ignores sessions outside the range and ones that never started", () => {
    const days = buildHeatmap(
      [
        fakeSession({ id: "jun", startedAt: at(2026, 5, 30), score: 90 }),
        fakeSession({ id: "cancelled", startedAt: null, score: null }),
      ],
      today,
    );
    expect(days.every((d) => d.sessions === 0 && d.level === 0)).toBe(true);
  });

  it("shades by the day's average score, not by how many sessions", () => {
    const days = buildHeatmap(
      [
        fakeSession({ id: "a", startedAt: at(2026, 6, 3), score: null }),
        fakeSession({ id: "b", startedAt: at(2026, 6, 4), score: 95 }),
        ...[9, 11, 13, 15, 17].map((h) =>
          fakeSession({ id: `c${h}`, startedAt: at(2026, 6, 5, h), score: 20 }),
        ),
      ],
      today,
    );
    // Held but not scored yet: no intensity, so it can't pass for a low score.
    expect(days[2]).toMatchObject({ sessions: 1, score: null, level: 0 });
    expect(days[3]).toMatchObject({ sessions: 1, score: 95, level: 4 });
    expect(days[4]).toMatchObject({ sessions: 5, score: 20, level: 1 });
  });
});

describe("scoreLevel", () => {
  it("buckets a 0-100 score into levels 1-4", () => {
    expect(scoreLevel(0)).toBe(1);
    expect(scoreLevel(39)).toBe(1);
    expect(scoreLevel(40)).toBe(2);
    expect(scoreLevel(59)).toBe(2);
    expect(scoreLevel(60)).toBe(3);
    expect(scoreLevel(79)).toBe(3);
    expect(scoreLevel(80)).toBe(4);
    expect(scoreLevel(100)).toBe(4);
  });
});
