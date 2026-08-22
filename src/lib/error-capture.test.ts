import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// error-capture.ts wraps console.error and expands Error args as a side
// effect of being imported, so every test in this file necessarily runs
// against the wrapped console.error -- that's the behavior under test.
import { consumeLastCapturedError, describeError } from "./error-capture";

describe("describeError", () => {
  it("includes the error's message", () => {
    expect(describeError(new Error("boom"))).toContain("boom");
  });

  it("walks the cause chain", () => {
    const root = new Error("root cause");
    const wrapped = new Error("wrapper", { cause: root });
    const described = describeError(wrapped);
    expect(described).toContain("wrapper");
    expect(described).toContain("caused by:");
    expect(described).toContain("root cause");
  });

  it("appends a status when the error carries one", () => {
    const err = Object.assign(new Error("not found"), { status: 404 });
    expect(describeError(err)).toContain("(status 404)");
  });

  it("stringifies non-Error values instead of throwing", () => {
    expect(describeError("just a string")).toBe("just a string");
    expect(describeError({ reason: "bad input" })).toContain("bad input");
  });
});

describe("consumeLastCapturedError", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Drain whatever a previous test may have left captured.
    consumeLastCapturedError();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Restored only once the whole file is done, not after every test --
  // error-capture.ts re-wraps console.error as a side effect of being
  // imported (once, at module load), so resetting it mid-file would leave
  // later tests in this block calling the unwrapped console.error, which
  // never calls record() and would silently break capture.
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it("captures an Error passed to console.error and returns it once", () => {
    const err = new Error("boom");
    console.error(err);
    expect(consumeLastCapturedError()).toBe(err);
    // Reading it again returns nothing -- it's consumed, not peeked.
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("returns undefined once the capture is older than the TTL", () => {
    vi.useFakeTimers();
    console.error(new Error("boom"));
    vi.advanceTimersByTime(6_000);
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("returns undefined when nothing has been captured", () => {
    expect(consumeLastCapturedError()).toBeUndefined();
  });
});
