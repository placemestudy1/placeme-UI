import { describe, expect, it } from "vitest";

import { legacyAppRedirect } from "./legacy-app-redirect";

describe("legacyAppRedirect", () => {
  it("ignores paths outside the parked /app family", () => {
    expect(legacyAppRedirect("/no-such-page", {})).toBeNull();
    expect(legacyAppRedirect("/apps", {})).toBeNull();
    expect(legacyAppRedirect("/application/x", {})).toBeNull();
  });

  it("sends the mobile home to the web home", () => {
    expect(legacyAppRedirect("/app", {})).toBe("/");
    expect(legacyAppRedirect("/app/", {})).toBe("/");
  });

  it.each([
    ["/app/login", "/login"],
    ["/app/signup", "/signup"],
    ["/app/consent", "/consent"],
    ["/app/account", "/account"],
    ["/app/history", "/history"],
    ["/app/join", "/join"],
    ["/app/match", "/match"],
    ["/app/new", "/rooms/new"],
  ])("maps %s to %s", (from, to) => {
    expect(legacyAppRedirect(from, {})).toBe(to);
  });

  it.each([
    ["/app/lobby", "/lobby/room-1"],
    ["/app/session", "/session/room-1"],
    ["/app/ended", "/ended/room-1"],
  ])("moves %s's roomId search param into the path", (from, to) => {
    expect(legacyAppRedirect(from, { roomId: "room-1" })).toBe(to);
  });

  it("encodes the roomId rather than trusting it as a path", () => {
    expect(legacyAppRedirect("/app/lobby", { roomId: "a/../b?c" })).toBe("/lobby/a%2F..%2Fb%3Fc");
  });

  it("falls back to /join when a room screen has no roomId", () => {
    expect(legacyAppRedirect("/app/lobby", {})).toBe("/join");
    expect(legacyAppRedirect("/app/session", { roomId: "" })).toBe("/join");
    expect(legacyAppRedirect("/app/ended", { roomId: 42 })).toBe("/join");
  });

  it("sends any other /app screen to the web home", () => {
    expect(legacyAppRedirect("/app/something-else", {})).toBe("/");
  });
});
