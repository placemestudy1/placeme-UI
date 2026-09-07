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
