import { describe, expect, it } from "vitest";

import type { HistorySession } from "@/lib/api";
import { realSessionsOnly } from "./history";

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
