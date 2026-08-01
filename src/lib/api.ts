// Thin fetch wrappers over gd-proto/apps/server's REST API. Same
// fetch-with-bearer-token pattern as gd-proto/apps/web/src/rooms/roomsApi.js —
// ported 1:1 rather than reinvented so the request/response shapes stay in
// sync with the real backend contract.
import type { Session } from "@supabase/supabase-js";

const API_URL = import.meta.env["VITE_API_URL"] || "http://localhost:3000";

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

export type ConsentStatus = { currentVersion: number; canEnableMic: boolean };

export const getConsentStatus = (session: Session | null) =>
  callApi<ConsentStatus>(session, "/api/consent/status", { method: "GET" });

export const grantConsent = (session: Session | null) =>
  callApi<{ consentVersion: number; grantedAt: string }>(session, "/api/consent", {
    method: "POST",
  });

/* -------------------------------- topics --------------------------------- */

export type Topic = { id: string; text: string; category?: string; difficulty?: string };

export const generateTopic = (
  session: Session | null,
  opts: { category?: string; difficulty?: string } = {},
) =>
  callApi<Topic>(session, "/api/topics/generate", { method: "POST", body: JSON.stringify(opts) });

export const submitCustomTopic = (
  session: Session | null,
  { text, category, difficulty }: { text: string; category?: string; difficulty?: string },
) =>
  callApi<Topic>(session, "/api/topics/custom", {
    method: "POST",
    body: JSON.stringify({ text, category, difficulty }),
  });

/* --------------------------------- rooms ---------------------------------- */

export type RoomSummary = {
  id: string;
  code: string;
  status: string;
  topicId?: string;
  durationSeconds?: number;
  maxParticipants?: number;
  visibility?: "public" | "private";
  level?: "beginner" | "intermediate" | "advanced";
};

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

export const joinRoomByCode = (session: Session | null, code: string) =>
  callApi<RoomSummary>(session, "/api/rooms/join", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

export const requestMatch = (
  session: Session | null,
  { durationSeconds }: { durationSeconds: number },
) =>
  callApi<{ status: "queued" } | (RoomSummary & { members: string[] })>(
    session,
    "/api/rooms/match",
    {
      method: "POST",
      body: JSON.stringify({ durationSeconds }),
    },
  );

export const leaveMatchQueue = (session: Session | null) =>
  callApi<{ status: "left" }>(session, "/api/rooms/match", { method: "DELETE" });

export const startRoom = (session: Session | null, roomId: string) =>
  callApi<{ id: string; status: string; endsAt?: number }>(session, `/api/rooms/${roomId}/start`, {
    method: "POST",
  });

export type RoomStatus = {
  id: string;
  status: "waiting" | "live" | "ended";
  code: string;
  topicText: string | null;
  durationSeconds: number;
  isCreator: boolean;
  endsAt?: number;
};

export const getRoomStatus = (session: Session | null, roomId: string) =>
  callApi<RoomStatus>(session, `/api/rooms/${roomId}/status`, { method: "GET" });

export type OpenRoom = {
  id: string;
  code: string;
  topicText: string | null;
  durationSeconds: number;
  maxParticipants: number;
  participantCount: number;
  hostDisplayName: string;
  createdAt: string;
};

export const listOpenRooms = (session: Session | null) =>
  callApi<{ rooms: OpenRoom[] }>(session, "/api/rooms/open", { method: "GET" });

export const getActiveRoom = (session: Session | null) =>
  callApi<{ room: { id: string; code: string; status: string } | null }>(
    session,
    "/api/rooms/mine/active",
    { method: "GET" },
  );

export const getRoomToken = (session: Session | null, roomId: string) =>
  callApi<{ token: string; url: string; identity: string; roomName: string }>(
    session,
    `/api/rooms/${roomId}/token`,
    {
      method: "POST",
    },
  );

export type RoomParticipant = { userId: string; displayName: string };

export const getRoomParticipants = (session: Session | null, roomId: string) =>
  callApi<{ participants: RoomParticipant[] }>(session, `/api/rooms/${roomId}/participants`, {
    method: "GET",
  });

export type TranscriptLine = {
  userId: string;
  displayName: string;
  text: string;
  startedAtMs: number;
};

export const getRoomTranscript = (session: Session | null, roomId: string) =>
  callApi<{ lines: TranscriptLine[] }>(session, `/api/rooms/${roomId}/transcript`, {
    method: "GET",
  });

export const getMyFeedback = (session: Session | null, roomId: string) =>
  callApi<{ feedback: string | null; rating?: boolean; ratingReason?: string }>(
    session,
    `/api/rooms/${roomId}/feedback/mine`,
    {
      method: "GET",
    },
  );

export const rateFeedback = (
  session: Session | null,
  roomId: string,
  { rating, reason }: { rating: boolean; reason?: string | undefined },
) =>
  callApi<{ rating: boolean; ratingReason: string | null }>(
    session,
    `/api/rooms/${roomId}/feedback/mine/rating`,
    {
      method: "PATCH",
      body: JSON.stringify({ rating, reason }),
    },
  );

/* -------------------------------- history --------------------------------- */

export type HistorySession = {
  id: string;
  code: string;
  status: "waiting" | "live" | "ended";
  durationSeconds: number;
  topicText: string | null;
  startedAt: string | null;
  endedAt: string | null;
  feedback: string | null;
};

export const getMyHistory = (session: Session | null) =>
  callApi<{ sessions: HistorySession[] }>(session, "/api/history/mine", { method: "GET" });
