import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  leaveRoom: vi.fn(),
  getEarlyLeaveEvaluation: vi.fn(),
}));

import { leaveRoom } from "@/lib/api";
import { beginEarlyLeaveEvaluation, readEarlyLeaveState } from "./early-leave-evaluation";

describe("early-leave evaluation state", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("stores the durable accepted state", async () => {
    vi.mocked(leaveRoom).mockResolvedValue({
      evaluation: {
        jobId: "job-1",
        status: "running",
        finality: "pending",
        accepted: true,
        disposition: "accepted",
      },
    });
    await beginEarlyLeaveEvaluation({} as never, "room-1");
    expect(readEarlyLeaveState("room-1")).toEqual({
      jobId: "job-1",
      status: "running",
      finality: "pending",
      accepted: true,
      disposition: "accepted",
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
    });
  });
});
