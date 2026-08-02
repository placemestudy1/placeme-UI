// Session-in-progress helper for the discussion room UI.
//
// Exports:
// - isSessionInProgress: true while a room's session is still live, or has
//   ended but its feedback hasn't finished generating (and hasn't failed) yet.
//
// Direct port of gd-proto/apps/web/src/rooms/sessionGuard.js — single source
// of truth for "is this student's room session still in progress", used to
// warn before an accidental tab close/refresh mid-discussion.
export function isSessionInProgress(
  status: string,
  feedback: string | null,
  feedbackFailed: boolean,
) {
  return status === "live" || (status === "ended" && !feedback && !feedbackFailed);
}
