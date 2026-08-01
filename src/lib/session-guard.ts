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
