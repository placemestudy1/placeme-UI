/**
 * Renders the mobile "room lobby" screen: shows the discussion topic, the
 * real participant list, and lets the host start the session — using the
 * shared useRoomLobby hook to poll the server and auto-navigate everyone
 * into the live session (or ended screen) once the room's status changes.
 *
 * Unlike the real web `/lobby/$roomId`, this is a flat route (no dynamic
 * path segment) — the room is identified by a `roomId` search param instead,
 * since every native `/app/*` screen predates per-room dynamic routing.
 *
 * - NativeLobby(): main route component; renders the lobby UI plus the
 *   footer start/join action and leave/cancel confirmation.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Ban, Copy, Mic, Play, Check, Settings2 } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  Banner,
  EmptyState,
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
import { cancellationMessage, useRoomLobby } from "@/lib/session/lobby";
import { isRoomReady, MIN_PARTICIPANTS_TO_START } from "@/lib/room-capacity";

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

// Main route component: renders the topic card, participant grid, and
// start/join footer action (status/roster polling comes from useRoomLobby).
function NativeLobby() {
  const search = Route.useSearch();
  const roomId = search.roomId ?? "";
  const { session } = useAuth();
  const navigate = useNavigate();

  const { status, participants, error, starting, leaving, handleStart, handleLeave } = useRoomLobby(
    session,
    roomId,
  );
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // See the identical comment in routes/lobby.$roomId.tsx (the web
  // equivalent of this screen) -- a waiting room can only reach "ended"
  // directly (without passing through "live") by being cancelled.
  const cancelled = status?.status === "ended" && !!status.endReason;

  useEffect(() => {
    if (status?.status === "live") {
      navigate({ to: "/app/session", search: { roomId } });
    } else if (status?.status === "ended" && !status.endReason) {
      navigate({ to: "/app/ended", search: { roomId } });
    }
  }, [status?.status, status?.endReason, roomId, navigate]);

  const code = status?.code ?? search.code ?? "";
  const topicText = status?.topicText ?? search.topicText ?? "Group discussion room";
  const isCreator = status?.isCreator ?? search.isCreator ?? false;
  const ready = isRoomReady(participants.length);

  function copyCode() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  async function leaveNow() {
    if (await handleLeave()) navigate({ to: "/app/join" });
  }

  async function confirmCancel() {
    if (await handleLeave()) {
      setConfirmCancelOpen(false);
      navigate({ to: "/app/join" });
    }
  }

  // See the identical comment in routes/lobby.$roomId.tsx.
  if (cancelled && status?.endReason) {
    return (
      <NativeStackScreen title={code || "Lobby"} backTo="/app/join" backLabel="Rooms">
        <EmptyState
          icon={<Ban />}
          title="This room was cancelled"
          description={cancellationMessage(status.endReason)}
          action={<PmButton onClick={() => navigate({ to: "/app/join" })}>Back to rooms</PmButton>}
          className="mx-5 mt-5"
        />
      </NativeStackScreen>
    );
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
        <div className="flex gap-3">
          {isCreator ? (
            <PmButton block size="lg" loading={starting} disabled={starting} onClick={handleStart}>
              <Play /> Start discussion
            </PmButton>
          ) : (
            <PmButton block size="lg" disabled>
              <Mic /> Waiting for host…
            </PmButton>
          )}
          <PmButton
            variant="ghost"
            size="lg"
            loading={leaving}
            disabled={leaving}
            onClick={isCreator ? () => setConfirmCancelOpen(true) : leaveNow}
          >
            {isCreator ? "Cancel" : "Leave"}
          </PmButton>
        </div>
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
          <SectionTitle
            title="Participants"
            subtitle={
              ready
                ? `${participants.length} joined · ready to start`
                : `${participants.length} joined · need ${
                    MIN_PARTICIPANTS_TO_START - participants.length
                  } more to start`
            }
          />
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

      <PmDialog
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        title="Cancel this room?"
        description="Everyone currently waiting will be removed and the room will close. This can't be undone."
        sheetOnMobile
        footer={
          <>
            <PmButton variant="ghost" block onClick={() => setConfirmCancelOpen(false)}>
              Keep waiting
            </PmButton>
            <PmButton
              variant="danger"
              block
              loading={leaving}
              disabled={leaving}
              onClick={confirmCancel}
            >
              Cancel room
            </PmButton>
          </>
        }
      >
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </PmDialog>
    </NativeStackScreen>
  );
}
