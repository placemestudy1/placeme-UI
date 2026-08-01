import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Copy, Check, Mic, Play, Settings2 } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  Banner,
  PmBadge,
  PmButton,
  PmCard,
  PmDialog,
  SectionTitle,
  StatusDot,
} from "@/components/pm/kit";
import { ParticipantTile } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import {
  getRoomStatus,
  getRoomParticipants,
  startRoom,
  type RoomStatus,
  type RoomParticipant,
} from "@/lib/api";

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

const POLL_INTERVAL_MS = 3000;

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LobbyPage() {
  const { roomId } = Route.useParams();
  const search = Route.useSearch();
  const { session } = useAuth();
  const navigate = useNavigate();

  // Search params are only a first-paint hint (mirrors gd-proto/apps/web's
  // router-state pattern) — everything below is re-derived from the server
  // on the very first poll, so a refresh never loses the room code/topic.
  const [status, setStatus] = useState<RoomStatus | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
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
      navigate({ to: "/session/$roomId", params: { roomId } });
    } else if (status?.status === "ended") {
      navigate({ to: "/ended/$roomId", params: { roomId } });
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
              <PmButton asChild variant="ghost" size="lg">
                <Link to="/">Leave</Link>
              </PmButton>
            </div>
          </PmCard>

          <div>
            <SectionTitle title="Participants" subtitle={`${participants.length} joined`} />
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
          {/*
            MOCK — device status here is decorative; real device selection would
            need navigator.mediaDevices.enumerateDevices() wiring (frontend-only
            follow-up, not a backend gap).
          */}
          <PmCard className="p-5">
            <SectionTitle title="Your setup" />
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Microphone</span>
                <StatusDot status="speaking" label="Ready" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transcript</span>
                <PmBadge tone="primary">Enabled</PmBadge>
              </div>
            </div>
          </PmCard>
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
    </WebShell>
  );
}
