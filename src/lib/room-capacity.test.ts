import { describe, expect, it } from "vitest";

import {
  DEFAULT_ROOM_PARTICIPANTS,
  MAX_ROOM_PARTICIPANTS,
  MIN_PARTICIPANTS_TO_START,
  MIN_ROOM_PARTICIPANTS,
  ROOM_CAPACITY_OPTIONS,
  isRoomReady,
  isSupportedRoomCapacity,
} from "./room-capacity";

describe("room capacity contract", () => {
  it("matches the API's inclusive 3–12 participant range", () => {
    expect(MIN_ROOM_PARTICIPANTS).toBe(3);
    expect(MAX_ROOM_PARTICIPANTS).toBe(12);
    expect(DEFAULT_ROOM_PARTICIPANTS).toBe(6);
    expect(ROOM_CAPACITY_OPTIONS).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it.each([3, 6, 12])("accepts supported capacity %s", (capacity) => {
    expect(isSupportedRoomCapacity(capacity)).toBe(true);
  });

  it.each([2, 13, 4.5, Number.NaN])("rejects unsupported capacity %s", (capacity) => {
    expect(isSupportedRoomCapacity(capacity)).toBe(false);
  });
});

describe("room readiness (SCRUM-26/27)", () => {
  it("matches gd-proto's roomReadiness.js minimum of 2", () => {
    expect(MIN_PARTICIPANTS_TO_START).toBe(2);
  });

  it.each([0, 1])("is not ready with %i participant(s)", (count) => {
    expect(isRoomReady(count)).toBe(false);
  });

  it.each([2, 3, 12])("is ready with %i participants", (count) => {
    expect(isRoomReady(count)).toBe(true);
  });
});
