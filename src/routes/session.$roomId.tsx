/**
 * Renders the live group-discussion session screen: connects to the live
 * LiveKit audio room, shows participant tiles, live captions/transcript and
 * the topic/timer, and provides mute/raise-hand/leave controls while a
 * discussion is in progress.
 *
 * - formatCountdown(): formats a remaining-seconds count as an mm:ss string
 *   for the timer pill.
 * - SessionPage(): main route component; connects to the live room via
 *   useLiveRoom, polls server room status for topic/code/end time, and
 *   renders the session UI plus the leave-confirmation dialog.
 * - refresh(): defined inside SessionPage's status-polling effect; fetches
 *   the current room status from the server, updates topic/code/end-time
 *   state, and redirects to the ended screen once the room has ended.
 * - confirmLeave(): defined inside SessionPage; leaves the live room and
 *   navigates back to the room's lobby.
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Hand, Mic, MicOff, PhoneOff, ScrollText, Users } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { PmBadge, PmButton, PmCard, PmDialog, SectionTitle, StatusDot } from "@/components/pm/kit";
import { ParticipantTile, TimerPill } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { getRoomStatus } from "@/lib/api";
import {
  useLiveRoom,
  LiveRoomError,
  LiveCaptionFeed,
  LiveTranscriptPanel,
} from "@/components/session/live-room";

export const Route = createFileRoute("/session/$roomId")({
  head: () => ({
    meta: [
      { title: "Live session · PlaceMe" },
      {
        name: "description",
        content: "Live voice group discussion with real-time transcript and speaking analytics.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <SessionPage />
    </ProtectedRoute>
  ),
});

// Formats a remaining-seconds count as an mm:ss string for the timer pill.
function formatCountdown(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Main route component: connects to the live room, polls server room status
// for the topic/code/end time, and renders participant tiles, live
// captions/transcript, controls, and the leave-confirmation dialog.
function SessionPage() {
  const { roomId } = Route.useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [topicText, setTopicText] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const live = useLiveRoom(roomId);

  // The server is the sole authority on room status/end time — poll it
  // alongside the LiveKit connection instead of relying on a local timer.
  // This effect starts that polling loop on mount and tears it down on
  // unmount.
  useEffect(() => {
    let cancelled = false;
    // Fetches the current room status and applies topic/code/end-time
    // updates, redirecting to the ended screen once the room has ended.
    function refresh() {
      getRoomStatus(session, roomId)
        .then((r) => {
          if (cancelled) return;
          if (r.topicText) setTopicText(r.topicText);
          if (r.code) setCode(r.code);
          if (r.endsAt) setEndsAt(r.endsAt);
          if (r.status === "ended") navigate({ to: "/ended/$roomId", params: { roomId } });
        })
        .catch(() => {});
    }
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, roomId, navigate]);

  useEffect(() => {
    if (!endsAt) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [endsAt]);

  // Leaves the live room and navigates back to the room's lobby.
  function confirmLeave() {
    live.leave();
    navigate({ to: "/lobby/$roomId", params: { roomId } });
  }

  return (
    <WebShell>
      <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PmBadge tone="live">
              <StatusDot status="live" /> Live
            </PmBadge>
            {code && <span className="font-mono text-xs text-muted-foreground">{code}</span>}
          </div>
          <h1 className="mt-2 truncate text-xl font-bold md:text-2xl">
            {topicText ?? "Group discussion"}
          </h1>
        </div>
        <TimerPill
          time={
            endsAt ? formatCountdown(Math.max(0, Math.round((endsAt - now) / 1000))) : undefined
          }
        />
      </div>

      {live.error && (
        <div className="mb-5">
          <LiveRoomError error={live.error} needsConsent={live.needsConsent} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {live.tiles.map((p) => (
              <ParticipantTile key={p.id} p={p} />
            ))}
          </div>

          <LiveCaptionFeed latestCaption={live.latestCaption} nameFor={live.nameFor} />

          <PmCard className="sticky bottom-24 flex flex-wrap items-center justify-center gap-3 p-4 md:bottom-6">
            <PmButton
              variant={live.muted ? "secondary" : "primary"}
              size="pill"
              aria-label={live.muted ? "Unmute" : "Mute"}
              onClick={live.toggleMute}
            >
              {live.muted ? <MicOff /> : <Mic />}
            </PmButton>
            {/* MOCK — no LiveKit data-channel signal for raise-hand yet, see docs/BACKEND_REQUIREMENTS.md#BE-20 */}
            <PmButton variant="secondary" size="pill" aria-label="Raise hand">
              <Hand />
            </PmButton>
            <PmButton variant="secondary" size="pill" aria-label="Participants">
              <Users />
            </PmButton>
            <PmButton variant="secondary" size="pill" aria-label="Transcript">
              <ScrollText />
            </PmButton>
            <PmButton
              variant="danger"
              size="pill"
              aria-label="Leave"
              onClick={() => setLeaving(true)}
            >
              <PhoneOff />
            </PmButton>
          </PmCard>
        </div>

        <aside className="space-y-4">
          <PmCard className="p-5">
            <SectionTitle title="Live transcript" subtitle="Attributed in real time" />
            <LiveTranscriptPanel captions={live.captions} nameFor={live.nameFor} />
          </PmCard>
          {/* MOCK — live per-participant speak-time isn't computed yet, see BE-17 */}
          <PmCard className="p-5">
            <SectionTitle title="Your speak time" />
            <p className="text-sm text-muted-foreground">Available once the session ends.</p>
          </PmCard>
        </aside>
      </div>

      <PmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Leave the discussion?"
        description="Leaving early means no AI feedback for this session."
        sheetOnMobile
        footer={
          <>
            <PmButton variant="ghost" block onClick={() => setLeaving(false)}>
              Stay
            </PmButton>
            <PmButton variant="danger" block onClick={confirmLeave}>
              Leave
            </PmButton>
          </>
        }
      />
    </WebShell>
  );
}
