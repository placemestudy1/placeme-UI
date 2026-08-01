import { useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteTrack, type RemoteParticipant } from "livekit-client";

import { useAuth } from "@/lib/auth-context";
import { getRoomToken, getRoomParticipants, type RoomParticipant } from "@/lib/api";
import { Banner, LiveCaption, TranscriptLineItem } from "@/components/pm/kit";
import { ParticipantTile } from "@/components/pm/blocks";
import type { Participant } from "@/lib/demo";

const decoder = new TextDecoder();
const MAX_CAPTIONS = 20;

// Must match the identity gd-proto/apps/server/src/agent/roomAgent.js mints
// for the transcription bot's own LiveKit token. Only that participant's
// captions are trusted — see gd-proto/apps/web/src/rooms/LiveRoomAudio.jsx
// for the full reasoning (N13/BUG-SPEC-0006 audit comments), ported as-is.
const TRANSCRIBER_IDENTITY = "transcriber";

type Caption = { id: number; identity: string; displayName: string; text: string };

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function useLiveRoom(roomId: string) {
  const { session, user } = useAuth();
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<Set<string>>(() => new Set());
  const [muted, setMuted] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const captionIdRef = useRef(0);
  // Supabase hands out a new session object on every token refresh — read
  // through a ref so the LiveKit connect effect below stays keyed on the
  // room id alone and never tears down/rejoins mid-discussion.
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    let cancelled = false;
    getRoomParticipants(sessionRef.current, roomId)
      .then((r) => {
        if (!cancelled) setParticipants(r.participants);
      })
      .catch(() => {
        /* names are a display enhancement; live audio still works without them */
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio) return;
      const el = track.attach();
      el.style.display = "none";
      document.body.appendChild(el);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      track.detach().forEach((el) => el.remove());
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setActiveSpeakerIds(new Set(speakers.map((s) => s.identity)));
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
      if (participant?.identity !== TRANSCRIBER_IDENTITY) return;
      try {
        const msg = JSON.parse(decoder.decode(payload));
        if (msg.type !== "transcript") return;
        const id = captionIdRef.current++;
        setCaptions((prev) => [
          ...prev.slice(-(MAX_CAPTIONS - 1)),
          { id, identity: msg.identity, displayName: msg.identity, text: msg.text },
        ]);
      } catch {
        /* ignore malformed payloads */
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) setStatus("disconnected");
    });

    (async () => {
      try {
        const { token, url } = await getRoomToken(sessionRef.current, roomId);
        if (cancelled) return;
        await room.connect(url, token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (!cancelled) setStatus("connected");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      room.disconnect();
    };
  }, [roomId]);

  async function toggleMute() {
    const room = roomRef.current;
    if (!room) return;
    const nextMuted = !muted;
    await room.localParticipant.setMicrophoneEnabled(!nextMuted);
    setMuted(nextMuted);
  }

  function leave() {
    roomRef.current?.disconnect();
  }

  const nameById = useMemo(
    () => new Map(participants.map((p) => [p.userId, p.displayName])),
    [participants],
  );
  function nameFor(identity: string) {
    return nameById.get(identity) ?? identity.slice(0, 8);
  }

  // Maps seated DB participants onto the shared `Participant` shape so the
  // existing ParticipantTile/kit components can render them unchanged.
  // `talkShare` has no live backend source yet (docs/BACKEND_REQUIREMENTS.md#BE-17)
  // — real-but-zero rather than a fabricated number. `college`/`role` aren't
  // returned by GET /api/rooms/:id/participants either (BE-14 covers the
  // signup-side gap; the participants endpoint would need its own change).
  const tiles: Participant[] = participants.map((p) => ({
    id: p.userId,
    name: p.displayName,
    initials: initialsFor(p.displayName),
    college: "",
    speaking: activeSpeakerIds.has(p.userId),
    muted: p.userId === user?.id ? muted : false,
    talkShare: 0,
  }));

  const needsConsent = error != null && /consent/i.test(error);
  const latestCaption = captions.at(-1);

  return {
    status,
    error,
    needsConsent,
    captions,
    tiles,
    muted,
    toggleMute,
    leave,
    nameFor,
    latestCaption,
  };
}

export function LiveRoomError({ error, needsConsent }: { error: string; needsConsent: boolean }) {
  return (
    <Banner
      tone="danger"
      title={needsConsent ? "Microphone consent required" : "Couldn't connect to the audio room"}
      description={
        needsConsent
          ? "Your microphone stays off until you've agreed to the consent terms. Review consent, then rejoin this room."
          : `${error}. Try refreshing the page.`
      }
    />
  );
}

export function LiveCaptionFeed({
  latestCaption,
  nameFor,
}: {
  latestCaption: Caption | undefined;
  nameFor: (id: string) => string;
}) {
  if (!latestCaption) return null;
  return <LiveCaption text={`${nameFor(latestCaption.identity)}: ${latestCaption.text}`} />;
}

export function LiveTranscriptPanel({
  captions,
  nameFor,
}: {
  captions: Caption[];
  nameFor: (id: string) => string;
}) {
  if (captions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Live captions will appear here as people speak…
      </p>
    );
  }
  return (
    <div className="no-scrollbar max-h-[520px] space-y-5 overflow-y-auto pr-1">
      {captions.map((c) => (
        <TranscriptLineItem
          key={c.id}
          speaker={nameFor(c.identity)}
          initials={initialsFor(nameFor(c.identity))}
          time=""
          text={c.text}
        />
      ))}
    </div>
  );
}
