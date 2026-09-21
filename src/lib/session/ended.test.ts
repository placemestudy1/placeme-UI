import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { createElement } from "react";

vi.mock("@/lib/api", () => ({
  getMyFeedback: vi.fn(),
  getRoomStatus: vi.fn(),
  getRoomTranscript: vi.fn(),
  getRoomParticipants: vi.fn(),
  rateFeedback: vi.fn(),
}));

import { getMyFeedback, getRoomParticipants, getRoomStatus, getRoomTranscript } from "@/lib/api";
import { useEndedSessionResources } from "./ended";

type Snapshot = ReturnType<typeof useEndedSessionResources>;

// null (not `{} as never`) so the reference is stable across re-renders --
// an unstable session identity would retrigger every effect that depends
// on it every render, masking the behavior under test.
function Probe({ roomId, onSnapshot }: { roomId: string; onSnapshot: (s: Snapshot) => void }) {
  const state = useEndedSessionResources(null, roomId);
  onSnapshot(state);
  return null;
}

function renderProbe(roomId: string) {
  let latest!: Snapshot;
  const view = render(createElement(Probe, { roomId, onSnapshot: (s) => (latest = s) }));
  return {
    view,
    get snapshot() {
      return latest;
    },
  };
}

describe("useEndedSessionResources (SCRUM-27)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRoomStatus).mockResolvedValue({
      id: "room-1",
      status: "ended",
      code: "GD-1234",
      topicText: "Topic",
      durationSeconds: 900,
      isCreator: false,
    });
    vi.mocked(getRoomTranscript).mockResolvedValue({ lines: [] });
    vi.mocked(getRoomParticipants).mockResolvedValue({ participants: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives up after the bounded poll, then a manual check-again succeeds once feedback is ready", async () => {
    vi.useFakeTimers();
    vi.mocked(getMyFeedback).mockResolvedValue({ feedback: null });

    let probe!: ReturnType<typeof renderProbe>;
    await act(async () => {
      probe = renderProbe("room-1");
    });
    expect(probe.snapshot.feedbackFailed).toBe(false);

    // 40 polls * 3000ms (MAX_FEEDBACK_POLLS * POLL_INTERVAL_MS in ended.ts).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(40 * 3000);
    });
    expect(probe.snapshot.feedbackFailed).toBe(true);
    expect(probe.snapshot.feedback).toBeNull();

    vi.mocked(getMyFeedback).mockResolvedValue({
      feedback: "Finally ready.",
      score: 70,
      dimensions: [],
      strengths: [],
      improvements: [],
    });
    await act(async () => {
      await probe.snapshot.checkFeedbackAgain();
    });

    expect(probe.snapshot.feedback).toBe("Finally ready.");
    expect(probe.snapshot.feedbackFailed).toBe(false);
  });

  it("retries the transcript on demand after a failed fetch", async () => {
    vi.mocked(getMyFeedback).mockResolvedValue({ feedback: null });
    vi.mocked(getRoomTranscript).mockRejectedValueOnce(new Error("network blip"));

    let probe!: ReturnType<typeof renderProbe>;
    await act(async () => {
      probe = renderProbe("room-2");
    });
    await waitFor(() => expect(probe.snapshot.transcriptError).toBe("network blip"));

    vi.mocked(getRoomTranscript).mockResolvedValue({
      lines: [{ userId: "u1", displayName: "Aarav", text: "hi", startedAtMs: 0 }],
    });
    await act(async () => {
      await probe.snapshot.retryTranscript();
    });

    expect(probe.snapshot.transcriptError).toBeNull();
    expect(probe.snapshot.transcript).toHaveLength(1);
  });
});
