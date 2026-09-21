import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { createElement } from "react";

vi.mock("@/lib/api", () => ({
  getRoomStatus: vi.fn(),
  getRoomParticipants: vi.fn(),
  leaveWaitingSeat: vi.fn(),
  startRoom: vi.fn(),
}));

import { getRoomParticipants, getRoomStatus, leaveWaitingSeat } from "@/lib/api";
import { useRoomLobby } from "./lobby";

type Snapshot = ReturnType<typeof useRoomLobby>;

function Probe({ roomId, onSnapshot }: { roomId: string; onSnapshot: (s: Snapshot) => void }) {
  const state = useRoomLobby(null, roomId);
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

describe("useRoomLobby (SCRUM-27 PR #12 review)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRoomStatus).mockResolvedValue({
      id: "room-1",
      status: "waiting",
      code: "GD-1234",
      topicText: "Topic",
      durationSeconds: 900,
      isCreator: false,
    });
    vi.mocked(getRoomParticipants).mockResolvedValue({ participants: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not let a background poll tick clear an error set by a failed leave action", async () => {
    vi.useFakeTimers();
    vi.mocked(leaveWaitingSeat).mockRejectedValue(new Error("Room already started"));

    let probe!: ReturnType<typeof renderProbe>;
    await act(async () => {
      probe = renderProbe("room-1");
    });
    expect(probe.snapshot.error).toBeNull();

    await act(async () => {
      await probe.snapshot.handleLeave();
    });
    expect(probe.snapshot.error).toBe("Room already started");

    // One full background poll tick, both calls succeeding -- this used to
    // unconditionally clear `error`, making it vanish out from under a
    // still-open cancel-confirmation dialog.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(probe.snapshot.error).toBe("Room already started");
  });
});
