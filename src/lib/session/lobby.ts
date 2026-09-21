// Shared waiting-room polling/actions for both the web (`/lobby/$roomId`)
// and native (`/app/lobby`) lobby screens (SCRUM-27, align lobby UX with
// server finality). Extracted so the fix below lives in exactly one place,
// same "shared session/* helper" pattern as stats.ts/history.ts.
//
// Exports:
// - useRoomLobby: polls room status *and* the participant roster together
//   on every tick, and exposes start/leave actions.
// - cancellationMessage: plain-language text for a room's endReason
//   (SCRUM-26), for both the web and native lobby's cancellation notice.
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getRoomParticipants,
  getRoomStatus,
  leaveWaitingSeat,
  startRoom,
  type RoomParticipant,
  type RoomStatus,
} from "@/lib/api";

const POLL_INTERVAL_MS = 3000;

export function useRoomLobby(session: Session | null, roomId: string) {
  const [status, setStatus] = useState<RoomStatus | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Previously, the roster was only re-fetched when `status.status` itself
  // changed (waiting -> live -> ended) -- so someone joining or leaving
  // mid-wait was invisible to everyone else already in the lobby until the
  // room's own status flipped. Polling both together on every tick keeps
  // the roster (and the readiness it implies) fresh the whole time the
  // room is waiting.
  useEffect(() => {
    if (!roomId) return undefined;
    let cancelled = false;
    function refresh() {
      // SCRUM-27 (PR #12 review): this used to setError(null) on every
      // successful poll tick, which cleared an error a user action
      // (handleStart/handleLeave) had just set -- an error shown inside the
      // cancel-confirmation dialog could vanish on its own within 3s while
      // the dialog was still open. The background poll no longer touches
      // `error` at all; only the actions themselves set or clear it.
      getRoomStatus(session, roomId)
        .then((r) => !cancelled && setStatus(r))
        .catch(() => {
          /* transient background refresh failure; the next poll tick retries. */
        });
      getRoomParticipants(session, roomId)
        .then((r) => !cancelled && setParticipants(r.participants))
        .catch(() => {
          /* names are a display enhancement */
        });
    }
    refresh();
    if (status?.status === "ended") return undefined;
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, roomId, status?.status]);

  // Calls the API to start the room (host only), tracking loading/error state.
  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      await startRoom(session, roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }

  // Gives up this student's seat (SCRUM-26) -- actually frees it server-side
  // (cancelling the whole room if the leaver is its creator), unlike a plain
  // client-side nav. Returns whether it succeeded so the caller can decide
  // whether to navigate away; a failed leave (e.g. the room already
  // started) should show the error and keep the student here rather than
  // silently abandoning a seat that's still theirs.
  async function handleLeave(): Promise<boolean> {
    setLeaving(true);
    setError(null);
    try {
      await leaveWaitingSeat(session, roomId);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLeaving(false);
    }
  }

  return { status, participants, error, starting, leaving, handleStart, handleLeave };
}

// SCRUM-26's two endReason values, in plain language for the lobby's
// cancellation notice (shown to every other participant still waiting when
// a room's status reaches "ended" with an endReason -- see the `cancelled`
// check in both lobby routes).
export function cancellationMessage(reason: NonNullable<RoomStatus["endReason"]>) {
  return reason === "cancelled_by_creator"
    ? "The host cancelled this room before it started."
    : "This room expired after sitting too long without starting.";
}
