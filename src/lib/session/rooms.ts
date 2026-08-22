// Shared room conversion helper for adapting a server OpenRoom into the
// demo Room shape used by RoomCard.
//
// Exports:
// - toRoomCard: converts an OpenRoom to the UI Room shape.

import type { OpenRoom } from "@/lib/api";
import type { Room } from "@/lib/demo";

/**
 * Converts a server OpenRoom into the Room shape the RoomCard UI expects.
 *
 * BE-4 (level) doesn't exist yet — an honest "Any level" rather than
 * fabricating one of the fixture data's three tiers.
 */
export function toRoomCard(r: OpenRoom): Room {
  return {
    code: r.code,
    topic: r.topicText ?? "Untitled discussion",
    host: r.hostDisplayName,
    seats: r.maxParticipants,
    filled: r.participantCount,
    level: "Any level",
    startsIn: "Waiting to start",
    duration: `${Math.round(r.durationSeconds / 60)} min`,
  };
}
