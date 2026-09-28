import { beforeEach, describe, expect, it } from "vitest";

import {
  attemptFromStart,
  getOpenAttemptId,
  loadAttempt,
  loadResult,
  loadResultMeta,
  saveAttempt,
  saveResult,
} from "./attempt-store";
import {
  crossedWarning,
  formatClock,
  formatDuration,
  remainingSeconds,
  timerTone,
  warningText,
} from "./timer";

const start = {
  attemptId: "att-1",
  testId: "test-1",
  questionIds: ["q1", "q2"],
  bankVersion: "v1",
  startedAt: "2026-09-29T10:00:00.000Z",
  endAt: "2026-09-29T10:30:00.000Z",
  now: "2026-09-29T10:00:05.000Z",
  answers: { q1: { c: 1, t: 100, r: false } },
  checkpointSeq: 2,
};

describe("attempt-store", () => {
  beforeEach(() => localStorage.clear());

  it("builds a new local attempt from the start response and marks it open", () => {
    const a = attemptFromStart(start, Date.parse("2026-09-29T10:00:00.000Z"));
    expect(a.serverOffsetMs).toBe(5000);
    expect(a.answers).toEqual(start.answers);
    expect(a.sentSeq).toBe(2);
    expect(loadAttempt("att-1")).toEqual(a);
    expect(getOpenAttemptId()).toBe("att-1");
  });

  it("keeps local progress when resuming the same attempt", () => {
    const first = attemptFromStart(start, Date.parse(start.now));
    saveAttempt({
      ...first,
      answers: { q1: { c: 3, t: 900, r: true } },
      dirty: true,
      currentIndex: 1,
      sentSeq: 5,
    });
    const resumed = attemptFromStart(start, Date.parse(start.now));
    expect(resumed.answers).toEqual({ q1: { c: 3, t: 900, r: true } });
    expect(resumed).toMatchObject({ dirty: true, currentIndex: 1, sentSeq: 5 });
  });

  it("saving the result drops the resume state and the open marker but keeps what the results page needs", () => {
    const a = attemptFromStart(start, Date.parse(start.now));
    const result = {
      attemptId: "att-1",
      score: 1,
      sectionScores: {},
      submitReason: "student" as const,
      submittedAt: start.endAt,
      keys: [],
    };
    saveResult("att-1", result, a);
    expect(loadResult("att-1")).toEqual(result);
    expect(loadResultMeta("att-1")).toEqual({
      testId: "test-1",
      questionIds: ["q1", "q2"],
      bankVersion: "v1",
      answers: a.answers,
    });
    expect(loadAttempt("att-1")).toBeNull();
    expect(getOpenAttemptId()).toBeNull();
  });
});

describe("timer", () => {
  it("counts down from the deadline using the server clock offset", () => {
    const end = "2026-09-29T10:30:00.000Z";
    const client = Date.parse("2026-09-29T10:29:00.000Z");
    expect(remainingSeconds(end, 0, client)).toBe(60);
    // Client clock 20s behind the server: 20s less remaining.
    expect(remainingSeconds(end, 20_000, client)).toBe(40);
    expect(remainingSeconds(end, 0, Date.parse(end) + 5000)).toBe(0);
  });

  it("formats clocks and durations", () => {
    expect(formatClock(125)).toBe("02:05");
    expect(formatClock(3725)).toBe("01:02:05");
    expect(formatDuration(83_000)).toBe("1m 23s");
    expect(formatDuration(9000)).toBe("9s");
  });

  it("turns amber from 5:00 and red from 0:10", () => {
    expect(timerTone(301)).toBe("normal");
    expect(timerTone(300)).toBe("warning");
    expect(timerTone(11)).toBe("warning");
    expect(timerTone(10)).toBe("danger");
    expect(timerTone(0)).toBe("danger");
  });

  it("warns once when crossing 5:00, 1:00 and 0:30, even across a skipped tick", () => {
    expect(crossedWarning(301, 300)).toBe(300);
    expect(crossedWarning(300, 299)).toBeNull();
    expect(crossedWarning(61, 60)).toBe(60);
    expect(crossedWarning(62, 58)).toBe(60); // tab was throttled
    expect(crossedWarning(60, 59)).toBeNull();
    expect(crossedWarning(31, 30)).toBe(30);
    expect(crossedWarning(30, 29)).toBeNull();
    expect(crossedWarning(62, 25)).toBe(30); // jumped past both: the more urgent one
    // Opening a test that already has little time left doesn't replay it.
    expect(crossedWarning(null, 45)).toBeNull();
  });

  it("words the warnings the way exam platforms do", () => {
    expect(warningText(300)).toBe("5 minutes remaining");
    expect(warningText(60)).toBe("1 minute remaining");
    expect(warningText(30)).toBe("30 seconds remaining");
  });
});
