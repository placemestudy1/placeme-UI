// Mirrors gd-proto/apps/server/src/domain/roomCapacity.js. Keep room-creation
// controls on both supported clients inside the API's accepted seat range.
export const MIN_ROOM_PARTICIPANTS = 3;
export const MAX_ROOM_PARTICIPANTS = 12;
export const DEFAULT_ROOM_PARTICIPANTS = 6;

export const ROOM_CAPACITY_OPTIONS = Array.from(
  { length: MAX_ROOM_PARTICIPANTS - MIN_ROOM_PARTICIPANTS + 1 },
  (_, index) => MIN_ROOM_PARTICIPANTS + index,
);

export function isSupportedRoomCapacity(value: number): boolean {
  return (
    Number.isInteger(value) && value >= MIN_ROOM_PARTICIPANTS && value <= MAX_ROOM_PARTICIPANTS
  );
}

// Mirrors gd-proto/apps/server/src/domain/roomReadiness.js (SCRUM-26). A
// distinct concept from MIN_ROOM_PARTICIPANTS above: this is the runtime
// minimum-seated-participant count a *waiting* room needs before it's
// allowed to go live, not the floor for a creator's configured seat cap.
// Display-only on this client (FR-012: the start gate is enforced
// server-side) -- used to show a fresh "N of 2 joined" readiness hint, not
// to block the Start action itself.
export const MIN_PARTICIPANTS_TO_START = 2;

export function isRoomReady(participantCount: number): boolean {
  return participantCount >= MIN_PARTICIPANTS_TO_START;
}
