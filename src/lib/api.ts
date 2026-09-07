// Thin fetch wrappers over gd-proto/apps/server's REST API. Same
// fetch-with-bearer-token pattern as gd-proto/apps/web/src/rooms/roomsApi.js —
// ported 1:1 rather than reinvented so the request/response shapes stay in
// sync with the real backend contract.
//
// Exports (grouped below by area — consent, topics, rooms, feedback, history):
// - callApi: shared bearer-token fetch wrapper all the functions below use.
// - getConsentStatus, grantConsent: consent status/grant endpoints.
// - generateTopic, submitCustomTopic: topic generation/submission endpoints.
// - createRoom, joinRoomByCode, requestMatch, leaveMatchQueue, startRoom,
//   getRoomStatus, listOpenRooms, getActiveRoom, getRoomToken,
//   getRoomParticipants, getRoomTranscript: room lifecycle/discovery
//   endpoints (create, join by code, random match, start, poll status,
//   browse open rooms, check for an active room, get a LiveKit token, list
//   participants, get the transcript).
// - getMyFeedback, rateFeedback: read this user's feedback for a room and
//   rate/annotate it.
// - getMyHistory: list this user's past sessions.
import type { Session } from "@supabase/supabase-js";
import type { components, operations } from "./api-types.generated";

// A successful (2xx) JSON response body for a generated operation -- for
// the handful of routes below whose response is an inline object literal
// in the contract rather than a named schema (e.g. POST /api/rooms/join),
// pulling the type straight from `operations` avoids hand-duplicating it.
type Ok<
  Op extends keyof operations,
  Status extends keyof operations[Op]["responses"],
> = operations[Op]["responses"][Status] extends {
  content: { "application/json": infer Body };
}
  ? Body
  : never;

// Named schemas from gd-proto's OpenAPI contract (openapi/gd-proto.openapi.yaml,
// regenerated via `npm run generate:api-types` -- see that script's header
// and scripts/sync-contract.mjs for how to pull a newer contract). Response
// shapes with no named schema (a route's response is an inline object
// literal in the spec, e.g. POST /api/rooms/join) stay hand-written below;
// everything else derives from the contract so a schema change is a type
// error here instead of a silent runtime mismatch.
type Schemas = components["schemas"];
export type ConsentStatus = Schemas["ConsentStatus"];
export type Topic = Schemas["Topic"];
export type RoomSummary = Schemas["RoomSummary"];
export type OpenRoom = Schemas["OpenRoom"];
export type RoomStatus = Schemas["RoomStatus"];
export type RoomParticipant = Schemas["RoomParticipant"];
export type TranscriptLine = Schemas["TranscriptLine"];
export type FeedbackDimension = Schemas["FeedbackDimension"];
export type FeedbackResult = Schemas["FeedbackResult"];
export type HistorySession = Schemas["HistorySession"];
export type DeletionRequest = Schemas["DeletionRequest"];

const API_URL = import.meta.env["VITE_API_URL"] || "http://localhost:3000";

// Shared fetch wrapper: attaches the Supabase bearer token, JSON-encodes the
// body when present, parses the JSON response, and throws with the server's
// error message (or the HTTP status) on a non-OK response.
async function callApi<T = unknown>(
  session: Session | null,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!session) throw new Error("Not signed in");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `status ${res.status}`);
  return body as T;
}

/* ------------------------------- consent -------------------------------- */

// Fetches whether this user can enable their mic (i.e. has granted the
// current consent version) and what that current version is.
export const getConsentStatus = (session: Session | null) =>
  callApi<ConsentStatus>(session, "/api/consent/status", { method: "GET" });

// Records this user's consent grant for the current consent version.
export const grantConsent = (session: Session | null) =>
  callApi<Ok<"grantConsent", 201>>(session, "/api/consent", { method: "POST" });

// Withdraws this user's latest consent (canEnableMic becomes false
// afterward); the consent row itself is kept, never deleted. A second call
// while already withdrawn is not an error (SPEC-0012 AC3).
export const withdrawConsent = (session: Session | null) =>
  callApi<Ok<"withdrawConsent", 200>>(session, "/api/consent/withdraw", { method: "POST" });

/* -------------------------------- account --------------------------------- */

// Submits a self-serve account-deletion request. Intake only -- a founder
// still executes the deletion via the existing manual process; a second call
// while one is pending returns the existing request rather than duplicating
// it (SPEC-0012 AC4).
export const requestAccountDeletion = (session: Session | null) =>
  callApi<DeletionRequest>(session, "/api/account/deletion-request", { method: "POST" });

/* -------------------------------- topics --------------------------------- */

// Requests an AI-generated discussion topic, optionally scoped to a category
// and/or difficulty.
export const generateTopic = (
  session: Session | null,
  opts: { category?: string; difficulty?: string } = {},
) =>
  callApi<Topic>(session, "/api/topics/generate", { method: "POST", body: JSON.stringify(opts) });

// Submits a user-authored custom topic for use in a room.
export const submitCustomTopic = (
  session: Session | null,
  { text, category, difficulty }: { text: string; category?: string; difficulty?: string },
) =>
  callApi<Topic>(session, "/api/topics/custom", {
    method: "POST",
    body: JSON.stringify({ text, category, difficulty }),
  });

/* --------------------------------- rooms ---------------------------------- */

// Creates a new discussion room for the given topic and settings.
export const createRoom = (
  session: Session | null,
  {
    topicId,
    durationSeconds,
    maxParticipants,
    visibility,
    level,
  }: {
    topicId: string;
    durationSeconds: number;
    maxParticipants?: number;
    visibility?: "public" | "private";
    level?: "beginner" | "intermediate" | "advanced";
  },
) =>
  callApi<RoomSummary>(session, "/api/rooms", {
    method: "POST",
    body: JSON.stringify({ topicId, durationSeconds, maxParticipants, visibility, level }),
  });

// Joins an existing room by its short room code.
export const joinRoomByCode = (session: Session | null, code: string) =>
  callApi<Ok<"joinRoomByCode", 200>>(session, "/api/rooms/join", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

// Requests random matchmaking into a room of the given duration; the server
// may return `{ status: "queued" }` while waiting for enough participants,
// or an already-formed room once matched.
export const requestMatch = (
  session: Session | null,
  { durationSeconds }: { durationSeconds: number },
) =>
  callApi<Ok<"requestMatch", 200> | Ok<"requestMatch", 201>>(session, "/api/rooms/match", {
    method: "POST",
    body: JSON.stringify({ durationSeconds }),
  });

// Leaves the random-match queue this user is currently waiting in.
export const leaveMatchQueue = (session: Session | null) =>
  callApi<Ok<"leaveMatchQueue", 200>>(session, "/api/rooms/match", { method: "DELETE" });

// Starts a waiting room, transitioning it to "live".
export const startRoom = (session: Session | null, roomId: string) =>
  callApi<Ok<"startRoom", 200>>(session, `/api/rooms/${roomId}/start`, { method: "POST" });

// Polls a room's current status (waiting/live/ended), topic, and timing info.
export const getRoomStatus = (session: Session | null, roomId: string) =>
  callApi<RoomStatus>(session, `/api/rooms/${roomId}/status`, { method: "GET" });

// Lists rooms open for anyone to browse/join.
export const listOpenRooms = (session: Session | null) =>
  callApi<Ok<"listOpenRooms", 200>>(session, "/api/rooms/open", { method: "GET" });

// Checks whether this user already has an active (waiting/live) room, so the
// UI can offer to rejoin it instead of starting a new one.
export const getActiveRoom = (session: Session | null) =>
  callApi<Ok<"getActiveRoom", 200>>(session, "/api/rooms/mine/active", { method: "GET" });

// Mints a LiveKit access token/connection URL for this user to join the
// room's audio.
export const getRoomToken = (session: Session | null, roomId: string) =>
  callApi<Ok<"getRoomToken", 200>>(session, `/api/rooms/${roomId}/token`, { method: "POST" });

// Lists the seated participants in a room (id, display name, talk share).
export const getRoomParticipants = (session: Session | null, roomId: string) =>
  callApi<Ok<"getRoomParticipants", 200>>(session, `/api/rooms/${roomId}/participants`, {
    method: "GET",
  });

// Fetches the full transcript recorded so far for a room.
export const getRoomTranscript = (session: Session | null, roomId: string) =>
  callApi<Ok<"getRoomTranscript", 200>>(session, `/api/rooms/${roomId}/transcript`, {
    method: "GET",
  });

// BE-6/BE-7 (SPEC-0006, gd-proto): score/dimensions/strengths/improvements
// are only ever present once feedback itself exists -- gd-proto's route
// returns bare { feedback: null } while generation is still in flight, so
// those fields must not be read (real or defaulted) before feedback is
// truthy. score can still be null even once feedback exists (a
// pre-migration row, or the transcription-failed stub) -- never render
// that as a real 0.
//
// Fetches this user's own generated feedback for a room, if it exists yet.
export const getMyFeedback = (session: Session | null, roomId: string) =>
  callApi<FeedbackResult>(session, `/api/rooms/${roomId}/feedback/mine`, { method: "GET" });

// Submits a thumbs up/down rating (with optional reason) for this user's
// feedback on a room.
export const rateFeedback = (
  session: Session | null,
  roomId: string,
  { rating, reason }: { rating: boolean; reason?: string | undefined },
) =>
  callApi<Ok<"rateFeedback", 200>>(session, `/api/rooms/${roomId}/feedback/mine/rating`, {
    method: "PATCH",
    body: JSON.stringify({ rating, reason }),
  });

/* -------------------------------- history --------------------------------- */

// Lists this user's past sessions (for the history screen and, per the BE-8
// comment on ProgressChart, as the client-side source for score-history
// trends too).
export const getMyHistory = (session: Session | null) =>
  callApi<{ sessions: HistorySession[] }>(session, "/api/history/mine", { method: "GET" });
