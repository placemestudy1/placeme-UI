import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: posthogMock }));

describe("analytics (no VITE_POSTHOG_KEY configured)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Explicitly stub empty rather than relying on the var being unset --
    // a real VITE_POSTHOG_KEY in .env.local would otherwise leak in via
    // Vite's env loading and silently defeat this "no key" scenario.
    vi.stubEnv("VITE_POSTHOG_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("initAnalytics is a no-op without a key", async () => {
    const { initAnalytics } = await import("./analytics");
    initAnalytics();
    expect(posthogMock.init).not.toHaveBeenCalled();
  });

  it("track/identifyUser/resetAnalytics are no-ops when never initialized", async () => {
    const { track, identifyUser, resetAnalytics } = await import("./analytics");
    track({ name: "consent_granted" });
    identifyUser("u1");
    resetAnalytics();
    expect(posthogMock.capture).not.toHaveBeenCalled();
    expect(posthogMock.identify).not.toHaveBeenCalled();
    expect(posthogMock.reset).not.toHaveBeenCalled();
  });
});

describe("analytics (VITE_POSTHOG_KEY configured)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("VITE_POSTHOG_KEY", "test-posthog-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("initializes PostHog with autocapture and session recording off", async () => {
    const { initAnalytics } = await import("./analytics");
    initAnalytics();
    expect(posthogMock.init).toHaveBeenCalledTimes(1);
    const [key, options] = posthogMock.init.mock.calls[0] as [string, Record<string, unknown>];
    expect(key).toBe("test-posthog-key");
    expect(options["autocapture"]).toBe(false);
    expect(options["capture_pageview"]).toBe(false);
    expect(options["disable_session_recording"]).toBe(true);
  });

  it("only initializes once even if called multiple times", async () => {
    const { initAnalytics } = await import("./analytics");
    initAnalytics();
    initAnalytics();
    expect(posthogMock.init).toHaveBeenCalledTimes(1);
  });

  it("track sends the event name and properties after init", async () => {
    const { initAnalytics, track } = await import("./analytics");
    initAnalytics();
    track({ name: "feedback_rated", properties: { roomId: "room-1", rating: true } });
    expect(posthogMock.capture).toHaveBeenCalledWith("feedback_rated", {
      roomId: "room-1",
      rating: true,
    });
  });

  it("track sends undefined properties for property-less events", async () => {
    const { initAnalytics, track } = await import("./analytics");
    initAnalytics();
    track({ name: "consent_granted" });
    expect(posthogMock.capture).toHaveBeenCalledWith("consent_granted", undefined);
  });

  it("identifyUser and resetAnalytics delegate to posthog after init", async () => {
    const { initAnalytics, identifyUser, resetAnalytics } = await import("./analytics");
    initAnalytics();
    identifyUser("u1");
    expect(posthogMock.identify).toHaveBeenCalledWith("u1");
    resetAnalytics();
    expect(posthogMock.reset).toHaveBeenCalledTimes(1);
  });
});
