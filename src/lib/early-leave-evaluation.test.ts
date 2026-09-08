import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";

vi.mock("@/lib/api", () => ({
  leaveRoom: vi.fn(),
  getEarlyLeaveEvaluation: vi.fn(),
}));

import { getEarlyLeaveEvaluation, leaveRoom } from "@/lib/api";
import {
  beginEarlyLeaveEvaluation,
  readEarlyLeaveState,
  useEarlyLeaveEvaluation,
} from "./early-leave-evaluation";

function Probe({ roomId }: { roomId: string }) {
  useEarlyLeaveEvaluation({} as never, roomId);
  return null;
}

describe("early-leave evaluation state", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("stores the durable accepted state", async () => {
    vi.mocked(leaveRoom).mockResolvedValue({
      evaluation: {
        jobId: "job-1",
        status: "running",
        finality: "pending",
        accepted: true,
        disposition: "accepted",
        terminal: false,
      },
    });
    await beginEarlyLeaveEvaluation({} as never, "room-1");
    expect(readEarlyLeaveState("room-1")).toEqual({
      jobId: "job-1",
      status: "running",
      finality: "pending",
      accepted: true,
      disposition: "accepted",
      terminal: false,
    });
  });

  it("keeps rejection retryable instead of pretending feedback is coming", async () => {
    vi.mocked(leaveRoom).mockRejectedValue(new Error("offline"));
    await expect(beginEarlyLeaveEvaluation({} as never, "room-1")).rejects.toThrow("offline");
    expect(readEarlyLeaveState("room-1")).toEqual({
      jobId: null,
      status: "failed",
      finality: "pending",
      accepted: false,
      terminal: true,
    });
  });

  it("does not poll job status after a locally rejected, unaccepted leave request", async () => {
    vi.mocked(leaveRoom).mockRejectedValue(new Error("offline"));
    await expect(beginEarlyLeaveEvaluation({} as never, "room-1")).rejects.toThrow("offline");

    render(createElement(Probe, { roomId: "room-1" }));

    expect(getEarlyLeaveEvaluation).not.toHaveBeenCalled();
  });

  it("does not poll after the server reports an accepted job as terminally failed", async () => {
    vi.mocked(leaveRoom).mockResolvedValue({
      evaluation: {
        jobId: "job-1",
        status: "failed",
        finality: "pending",
        accepted: true,
        disposition: "already_accepted",
        terminal: true,
      },
    });
    await beginEarlyLeaveEvaluation({} as never, "room-1");

    render(createElement(Probe, { roomId: "room-1" }));

    expect(getEarlyLeaveEvaluation).not.toHaveBeenCalled();
  });
});
