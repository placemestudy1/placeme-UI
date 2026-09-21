/**
 * Lobby screen shown to a student after joining or creating a group
 * discussion room, while everyone waits for the host to start the session.
 * Polls the room's status and participant list from the server (via
 * useRoomLobby), lets the host start the discussion, and auto-navigates
 * everyone to the live session (or the ended screen) once the room's
 * status changes.
 *
 * - initialsFor(): derives up to two-letter initials from a participant's
 *   display name, used for avatar tiles.
 * - LobbyPage(): main route component — renders the waiting-room UI (topic,
 *   invite code, start/leave actions, participant grid) and the audio-
 *   settings/leave-confirmation dialogs.
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Ban, Copy, Check, Mic, Play, Settings2 } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  Banner,
  EmptyState,
  PmBadge,
  PmButton,
  PmCard,
  PmDialog,
  SectionTitle,
  StatusDot,
} from "@/components/pm/kit";
import { ParticipantTile } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { cancellationMessage, useRoomLobby } from "@/lib/session/lobby";
import { isRoomReady, MIN_PARTICIPANTS_TO_START } from "@/lib/room-capacity";
import { track } from "@/lib/analytics";

const searchSchema = z.object({
  code: z.string().optional(),
  topicText: z.string().optional(),
  isCreator: z.boolean().optional(),
});

export const Route = createFileRoute("/lobby/$roomId")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Room lobby · PlaceMe" },
      {
        name: "description",
        content: "Wait with your group, check your mic and review the topic before the GD starts.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <LobbyPage />
    </ProtectedRoute>
  ),
});

// Builds up to two initials (e.g. "Jane Doe" -> "JD") from a display name, for avatar tiles.
function initialsFor(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Main lobby route component: renders the topic/invite code/start-or-wait
// actions and participant grid, opens the audio settings dialog, and
// redirects to the live session or ended screen once the room status
// changes (all polling/actions come from useRoomLobby).
function LobbyPage() {
  const { roomId } = Route.useParams();
  const search = Route.useSearch();
  const { session } = useAuth();
  const navigate = useNavigate();

  const { status, participants, error, starting, leaving, handleStart, handleLeave } = useRoomLobby(
    session,
    roomId,
  );
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // A waiting room can only reach "ended" by being cancelled (creator gave
  // up their seat, or the sweep expired it) -- one that actually starts
  // goes through "live" first, which navigates away from this screen
  // before it can ever see "ended" directly. status.endReason (SCRUM-26)
  // makes that explicit instead of relying on the implicit "ended  without
  // ever going live" invariant, so a genuinely-ended room with no
  // endReason (the historical/fallback case) still falls through to the
  // normal post-session flow below.
  const cancelled = status?.status === "ended" && !!status.endReason;

  useEffect(() => {
    if (status?.status === "live") {
      track({ name: "session_started", properties: { roomId } });
      navigate({ to: "/session/$roomId", params: { roomId } });
    } else if (status?.status === "ended" && !status.endReason) {
      navigate({ to: "/ended/$roomId", params: { roomId } });
    }
  }, [status?.status, status?.endReason, roomId, navigate]);

  const code = status?.code ?? search.code ?? "";
  const topicText = status?.topicText ?? search.topicText ?? "Group discussion room";
  const isCreator = status?.isCreator ?? search.isCreator ?? false;
  const ready = isRoomReady(participants.length);

  // Copies the room code to the clipboard and shows a brief "copied" confirmation.
  function copyCode() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  // Non-creator: leaves immediately (only frees their own seat). Creator:
  // leaving cancels the room for everyone still waiting, so that action is
  // gated behind the confirmation dialog instead (see confirmCancel below).
  async function leaveNow() {
    if (await handleLeave()) navigate({ to: "/" });
  }

  async function confirmCancel() {
    if (await handleLeave()) {
      setConfirmCancelOpen(false);
      navigate({ to: "/" });
    }
  }

  // Reached by every other participant still waiting when the room's
  // creator cancels (or the sweep expires it) -- this is not a session
  // that ran, so it must not route into the feedback screen (SCRUM-27 PR
  // #12 review finding: "routes participants to the feedback screen
  // instead of a cancellation notice").
  if (cancelled && status?.endReason) {
    return (
      <WebShell title="Room lobby" {...(code ? { subtitle: code } : {})}>
        <EmptyState
          icon={<Ban />}
          title="This room was cancelled"
          description={cancellationMessage(status.endReason)}
          action={<PmButton onClick={() => navigate({ to: "/" })}>Back to home</PmButton>}
        />
      </WebShell>
    );
  }

  return (
    <WebShell
      title="Room lobby"
      subtitle={code ? `${code} · waiting for the host to start` : "Loading…"}
      actions={
        <PmButton variant="outline" onClick={() => setSettingsOpen(true)}>
          <Settings2 /> Audio settings
        </PmButton>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <PmCard glass className="p-6 md:p-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <PmBadge tone="neutral">
                  <StatusDot status="idle" /> Waiting to start
                </PmBadge>
                <h2 className="mt-3 text-xl font-bold md:text-2xl">{topicText}</h2>
              </div>
              {code && (
                <button
                  onClick={copyCode}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-secondary px-3 py-2 font-mono text-sm"
                >
                  {code}
                  {copied ? (
                    <Check className="size-3.5 text-success" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              )}
            </div>
            {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              {isCreator ? (
                <PmButton size="lg" loading={starting} disabled={starting} onClick={handleStart}>
                  <Play /> Start discussion
                </PmButton>
              ) : (
                <PmButton size="lg" disabled>
                  <Mic /> Waiting for host…
                </PmButton>
              )}
              <PmButton variant="outline" size="lg" onClick={copyCode}>
                <Copy /> Copy invite link
              </PmButton>
              <PmButton
                variant="ghost"
                size="lg"
                loading={leaving}
                disabled={leaving}
                onClick={isCreator ? () => setConfirmCancelOpen(true) : leaveNow}
              >
                {isCreator ? "Cancel room" : "Leave"}
              </PmButton>
            </div>
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {participants.map((p) => (
                <ParticipantTile
                  key={p.userId}
                  // talkShare has no meaning before the audio room exists —
                  // real-but-zero, not a fabricated number (see live-room.tsx).
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
        </div>

        <aside className="space-y-4">
          <Banner
            tone="info"
            title="Ground rules"
            description="Don't interrupt mid-sentence, back claims with data, and give quieter members room."
          />
        </aside>
      </div>

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
    </WebShell>
  );
}
