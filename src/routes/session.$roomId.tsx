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
 *   navigates to the ended/report screen.
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Copy, Hand, Mic, MicOff, PhoneOff, ScrollText, Users } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  PmAvatar,
  PmBadge,
  PmButton,
  PmCard,
  PmDialog,
  SectionTitle,
  StatusDot,
} from "@/components/pm/kit";
import { ParticipantTile, TimerPill } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { getRoomStatus } from "@/lib/api";
import { track } from "@/lib/analytics";
import { beginEarlyLeaveEvaluation } from "@/lib/early-leave-evaluation";
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
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [topicText, setTopicText] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const live = useLiveRoom(roomId);

  // Copies the room code to clipboard and briefly shows a checkmark.
  function copyCode() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

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
          if (r.status === "ended") {
            track({ name: "session_completed", properties: { roomId } });
            navigate({ to: "/ended/$roomId", params: { roomId } });
          }
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

  // Exit is immediate; durable evaluation acceptance continues independently.
  function confirmLeave() {
    live.leave();
    beginEarlyLeaveEvaluation(session, roomId).catch(() => {});
    track({ name: "session_left_early", properties: { roomId } });
    navigate({ to: "/ended/$roomId", params: { roomId } });
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
            <PmButton
              variant={live.handRaised ? "primary" : "secondary"}
              size="pill"
              aria-label="Raise hand"
              onClick={live.toggleHand}
            >
              <Hand />
            </PmButton>
            <PmButton
              variant={participantsOpen ? "primary" : "secondary"}
              size="pill"
              aria-label="Participants"
              onClick={() => setParticipantsOpen(true)}
            >
              <Users />
            </PmButton>
            {/* Transcript button is only useful on mobile — the aside panel
                already shows it on larger screens */}
            <PmButton
              variant={transcriptOpen ? "primary" : "secondary"}
              size="pill"
              aria-label="Transcript"
              className="lg:hidden"
              onClick={() => setTranscriptOpen(true)}
            >
              <ScrollText />
            </PmButton>
            <PmButton
              variant="secondary"
              size="pill"
              aria-label={copied ? "Copied" : "Copy room code"}
              onClick={copyCode}
            >
              {copied ? <Check /> : <Copy />}
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

      {/* ── Participants sheet ── */}
      <PmDialog
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        title="Participants"
        description={`${live.tiles.length} in this session`}
        sheetOnMobile
        footer={
          <PmButton block onClick={() => setParticipantsOpen(false)}>
            Done
          </PmButton>
        }
      >
        <div className="space-y-3">
          {live.tiles.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <PmAvatar
                initials={p.initials}
                size="sm"
                ring={p.speaking ? "speaking" : p.muted ? "muted" : "none"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {p.name}
                  {p.id === session?.user.id && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {p.speaking && <StatusDot status="speaking" label="Speaking" />}
                {p.muted && !p.speaking && <StatusDot status="muted" label="Muted" />}
                {p.handRaised && <span title="Hand raised">✋</span>}
              </div>
            </div>
          ))}
          {live.tiles.length === 0 && (
            <p className="text-sm text-muted-foreground">Waiting for participants to connect…</p>
          )}
        </div>
      </PmDialog>

      {/* ── Live transcript sheet (mobile only) ── */}
      <PmDialog
        open={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        title="Live transcript"
        description="Attributed in real time"
        sheetOnMobile
        footer={
          <PmButton block onClick={() => setTranscriptOpen(false)}>
            Done
          </PmButton>
        }
      >
        <LiveTranscriptPanel captions={live.captions} nameFor={live.nameFor} />
      </PmDialog>

      {/* ── Leave confirmation ── */}
      <PmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Leave the discussion?"
        description="We'll try to generate feedback from what was captured before you leave."
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
