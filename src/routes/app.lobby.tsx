/**
 * Renders the mobile "room lobby" screen: shows the discussion topic, the
 * real participant list, and lets the host start the session — polling the
 * server and auto-navigating everyone into the live session (or ended
 * screen) once the room's status changes.
 *
 * Unlike the real web `/lobby/$roomId`, this is a flat route (no dynamic
 * path segment) — the room is identified by a `roomId` search param instead,
 * since every native `/app/*` screen predates per-room dynamic routing.
 *
 * - initialsFor(): derives up to two-letter initials from a display name.
 * - NativeLobby(): main route component; polls room status/participants and
 *   renders the lobby UI plus the footer start/join action.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Copy, Mic, Play, Check, Settings2 } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  Banner,
  PmBadge,
  PmButton,
  PmCard,
  SectionTitle,
  StatusDot,
  PmDialog,
} from "@/components/pm/kit";
import { ParticipantTile } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { initialsFor } from "@/lib/session/participants";
import {
  getRoomStatus,
  getRoomParticipants,
  startRoom,
  type RoomStatus,
  type RoomParticipant,
} from "@/lib/api";

const searchSchema = z.object({
  roomId: z.string().optional(),
  code: z.string().optional(),
  topicText: z.string().optional(),
  isCreator: z.boolean().optional(),
});

export const Route = createFileRoute("/app/lobby")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Lobby · PlaceMe Mobile" },
      { name: "description", content: "Wait for your group and check your mic before the GD." },
      { property: "og:title", content: "Room lobby · PlaceMe Mobile" },
      { property: "og:description", content: "Your discussion starts in a moment." },
    ],
  }),
  component: () => (
    <ProtectedRoute redirectTo="/app/login" consentRedirectTo="/app/consent">
      <NativeLobby />
    </ProtectedRoute>
  ),
});

const POLL_INTERVAL_MS = 3000;

// Main route component: polls real room status/participants and renders the
// topic card, participant grid, and start/join footer action.
function NativeLobby() {
  const search = Route.useSearch();
  const roomId = search.roomId ?? "";
  const { session } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<RoomStatus | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!roomId) return undefined;
    let cancelled = false;
    function refresh() {
      getRoomStatus(session, roomId)
        .then((r) => {
          if (!cancelled) {
            setStatus(r);
            setError(null);
          }
        })
        .catch((e: Error) => !cancelled && setError(e.message));
    }
    refresh();
    if (status?.status === "ended") return undefined;
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, roomId, status?.status]);

  useEffect(() => {
    if (!roomId) return undefined;
    let cancelled = false;
    getRoomParticipants(session, roomId)
      .then((r) => !cancelled && setParticipants(r.participants))
      .catch(() => {
        /* names are a display enhancement */
      });
    return () => {
      cancelled = true;
    };
  }, [session, roomId, status?.status]);

  useEffect(() => {
    if (status?.status === "live") {
      navigate({ to: "/app/session", search: { roomId } });
    } else if (status?.status === "ended") {
      navigate({ to: "/app/ended", search: { roomId } });
    }
  }, [status?.status, roomId, navigate]);

  const code = status?.code ?? search.code ?? "";
  const topicText = status?.topicText ?? search.topicText ?? "Group discussion room";
  const isCreator = status?.isCreator ?? search.isCreator ?? false;

  function copyCode() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

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

  return (
    <NativeStackScreen
      title={code || "Lobby"}
      backTo="/app/join"
      backLabel="Rooms"
      right={
        <div className="flex gap-4 items-center">
          <button className="text-muted-foreground" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="size-5" />
          </button>
          <button className="text-primary-glow" onClick={copyCode}>
            {copied ? <Check className="size-5 text-success" /> : <Copy className="size-5" />}
          </button>
        </div>
      }
      footer={
        isCreator ? (
          <PmButton block size="lg" loading={starting} disabled={starting} onClick={handleStart}>
            <Play /> Start discussion
          </PmButton>
        ) : (
          <PmButton block size="lg" disabled>
            <Mic /> Waiting for host…
          </PmButton>
        )
      }
    >
      <div className="space-y-5 px-5 py-5">
        <PmCard glass className="p-4">
          <PmBadge tone="live">
            <StatusDot status="live" /> Waiting to start
          </PmBadge>
          <h2 className="mt-3 text-lg font-bold leading-snug">{topicText}</h2>
          {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
        </PmCard>

        <div>
          <SectionTitle title="Participants" subtitle={`${participants.length} joined`} />
          <div className="grid grid-cols-2 gap-3">
            {participants.map((p) => (
              <ParticipantTile
                key={p.userId}
                compact
                p={{
                  id: p.userId,
                  name: p.displayName,
                  initials: initialsFor(p.displayName),
                  college: "",
                  talkShare: 0,
                }}
              />
            ))}
          </div>
        </div>

        <Banner
          tone="info"
          title="Ground rules"
          description="No mid-sentence interruptions. Give quieter members room — listening is scored."
        />
      </div>
      {!roomId && (
        <p className="px-5 text-sm text-muted-foreground">
          No room selected —{" "}
          <Link to="/app/join" className="font-semibold text-primary-glow">
            join or create one
          </Link>
          .
        </p>
      )}
      <PmDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Audio settings"
        description="Changes apply to this session only."
        sheetOnMobile
        footer={
          <>
            <PmButton variant="ghost" block onClick={() => setSettingsOpen(false)}>
              Cancel
            </PmButton>
            <PmButton block onClick={() => setSettingsOpen(false)}>
              Save
            </PmButton>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            Input <span className="text-foreground">System default</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            Output <span className="text-foreground">System default</span>
          </div>
        </div>
      </PmDialog>
    </NativeStackScreen>
  );
}
