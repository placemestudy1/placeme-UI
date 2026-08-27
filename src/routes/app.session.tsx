/**
 * Renders the mobile "live session" screen: connects to the live LiveKit
 * audio room (via the same `useLiveRoom` hook the real web `/session`
 * route uses), and provides mic/raise-hand/transcript/leave controls plus a
 * room/transcript tab view.
 *
 * Unlike the real web `/session/$roomId`, this is a flat route — the room
 * is identified by a `roomId` search param instead (see app.lobby.tsx).
 *
 * - NativeSession(): main route component; manages the tab/leaving UI state
 *   and renders the room/transcript tabs plus the leave dialog.
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Hand, Lightbulb, Mic, MicOff, PhoneOff, ScrollText } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { PmBadge, PmButton, PmDialog, ScoreRing, StatusDot } from "@/components/pm/kit";
import { ParticipantTile } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { getRoomStatus } from "@/lib/api";
import {
  useLiveRoom,
  LiveRoomError,
  LiveCaptionFeed,
  LiveTranscriptPanel,
} from "@/components/session/live-room";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ roomId: z.string().optional() });

export const Route = createFileRoute("/app/session")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Live session · PlaceMe Mobile" },
      { name: "description", content: "Live voice GD with real-time captions on mobile." },
      { property: "og:title", content: "Live session · PlaceMe Mobile" },
      { property: "og:description", content: "Speak, listen and get scored in real time." },
    ],
  }),
  component: () => (
    <ProtectedRoute redirectTo="/app/login" consentRedirectTo="/app/consent">
      <NativeSession />
    </ProtectedRoute>
  ),
});

function formatCountdown(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Main route component: connects to the real live room, polls server room
// status for the topic/code/end time, and renders the room/transcript tabs,
// footer controls, and leave-confirmation dialog.
function NativeSession() {
  const { roomId: rawRoomId } = Route.useSearch();
  const roomId = rawRoomId ?? "";
  const { session } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"room" | "transcript">("room");
  const [leaving, setLeaving] = useState(false);
  const [topicText, setTopicText] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const live = useLiveRoom(roomId);

  useEffect(() => {
    if (!roomId) return undefined;
    let cancelled = false;
    function refresh() {
      getRoomStatus(session, roomId)
        .then((r) => {
          if (cancelled) return;
          if (r.topicText) setTopicText(r.topicText);
          if (r.code) setCode(r.code);
          if (r.durationSeconds) setDurationSeconds(r.durationSeconds);
          if (r.endsAt) setEndsAt(r.endsAt);
          if (r.status === "ended") navigate({ to: "/app/ended", search: { roomId } });
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

  function confirmLeave() {
    live.leave();
    navigate({ to: "/app/lobby", search: { roomId } });
  }

  return (
    <NativeStackScreen
      bare
      footerDark
      footer={
        <div className="flex items-center justify-between gap-2">
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
            variant={tab === "transcript" ? "primary" : "secondary"}
            size="pill"
            aria-label="Transcript"
            onClick={() => setTab(tab === "room" ? "transcript" : "room")}
          >
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
        </div>
      }
    >
      <div className="min-h-full bg-[#0f172a] text-white">
        <div className="flex items-center gap-3 px-5 pb-3">
          <ScoreRing
            score={endsAt ? Math.max(0, Math.round((endsAt - now) / 1000)) : 0}
            max={durationSeconds ?? 1}
            size={40}
            strokeWidth={4}
            label=""
            valueLabel={
              endsAt ? formatCountdown(Math.max(0, Math.round((endsAt - now) / 1000))) : "--:--"
            }
            tone="light"
          />
          <PmBadge tone="live">
            <StatusDot status="live" /> Live{code ? ` · ${code}` : ""}
          </PmBadge>
        </div>
        <div className="px-5">
          <h1 className="text-base font-bold leading-snug">{topicText ?? "Group discussion"}</h1>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
            <Lightbulb className="size-3.5 shrink-0 text-primary-glow" />
            <span className="text-[11px] font-semibold text-primary-glow/90">
              Give quieter voices room — balanced airtime scores best.
            </span>
          </div>
          {live.error && (
            <div className="mt-3">
              <LiveRoomError error={live.error} needsConsent={live.needsConsent} />
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1">
            {(["room", "transcript"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg py-2 text-xs font-semibold capitalize transition-colors",
                  tab === t ? "bg-white text-[#0f172a]" : "text-white/60",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          {tab === "room" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {live.tiles.map((p) => (
                  <ParticipantTile key={p.id} p={p} compact dark />
                ))}
              </div>
              <LiveCaptionFeed latestCaption={live.latestCaption} nameFor={live.nameFor} />
            </>
          ) : (
            <LiveTranscriptPanel captions={live.captions} nameFor={live.nameFor} />
          )}
        </div>
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
    </NativeStackScreen>
  );
}
