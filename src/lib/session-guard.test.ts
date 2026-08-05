import { describe, expect, it } from "vitest";

import { isSessionInProgress } from "./session-guard";

describe("isSessionInProgress", () => {
  it("is true while the room is live", () => {
    expect(isSessionInProgress("live", null, false)).toBe(true);
  });

  it("is true once ended but feedback hasn't arrived or failed yet", () => {
    expect(isSessionInProgress("ended", null, false)).toBe(true);
  });

  it("is false once ended feedback has arrived", () => {
    expect(isSessionInProgress("ended", "Great job on framing the discussion.", false)).toBe(false);
  });

  it("is false once ended feedback generation has failed", () => {
    expect(isSessionInProgress("ended", null, true)).toBe(false);
  });

  it("is false for a room that never went live", () => {
    expect(isSessionInProgress("waiting", null, false)).toBe(false);
  });
});
