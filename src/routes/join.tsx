/**
 * Screen for joining a group discussion room — either by entering a room
 * code directly, or by browsing and searching a list of currently open
 * rooms fetched from the server.
 *
 * - toRoomCard(): adapts a server OpenRoom into the demo Room shape used by RoomCard.
 * - JoinPage(): main route component — room-code entry form plus the open-rooms browser.
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, Ticket } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  Field,
  PmButton,
  PmCard,
  PmInput,
  SectionTitle,
  CardSkeleton,
  EmptyState,
} from "@/components/pm/kit";
import { RoomCard } from "@/components/pm/blocks";
import type { Room } from "@/lib/demo";
import { useAuth } from "@/lib/auth-context";
import { joinRoomByCode, listOpenRooms, type OpenRoom } from "@/lib/api";

// Converts a server OpenRoom into the Room shape the RoomCard UI expects.
// BE-4 (level) doesn't exist yet -- an honest "any level" rather than
// fabricating one of the fixture data's three tiers.
function toRoomCard(r: OpenRoom): Room {
  return {
    code: r.code,
    topic: r.topicText ?? "Untitled discussion",
    host: r.hostDisplayName,
    seats: r.maxParticipants,
    filled: r.participantCount,
    level: "Any level",
    startsIn: "Waiting to start",
    duration: `${Math.round(r.durationSeconds / 60)} min`,
  };
}

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join a room · PlaceMe" },
      {
        name: "description",
        content: "Enter a room code or browse open group discussions to join right now.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <JoinPage />
    </ProtectedRoute>
  ),
});

// Main join-room route component: code-entry form to join directly, plus a
// searchable/browsable list of open rooms fetched from the server.
function JoinPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoom[] | null>(null);

  useEffect(() => {
    listOpenRooms(session)
      .then((r) => setOpenRooms(r.rooms))
      .catch(() => setOpenRooms([]));
  }, [session]);

  // Submits the room code, joins the room via the API, and navigates to its lobby on success.
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const room = await joinRoomByCode(session, code.trim());
      navigate({ to: "/lobby/$roomId", params: { roomId: room.id }, search: { code: room.code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WebShell title="Join a room" subtitle="Have a code, or browse rooms open right now">
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <PmCard glass className="h-fit p-6">
          <SectionTitle title="Have a code?" subtitle="Ask the host for their room code" />
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="Room code">
              <PmInput
                placeholder="GD-0000"
                icon={<Ticket />}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono tracking-[0.2em]"
              />
            </Field>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <PmButton type="submit" block size="lg" loading={busy} disabled={busy || !code.trim()}>
              {busy ? "Joining…" : "Join room"}
            </PmButton>
          </form>
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-xs text-muted-foreground">
              Codes expire 15 minutes after a session ends.
            </p>
          </div>
        </PmCard>

        <div>
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <PmInput placeholder="Search topics, hosts or colleges…" icon={<Search />} />
            <PmButton variant="outline">Filters</PmButton>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {openRooms === null && (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            )}
            {openRooms?.map((r) => (
              <RoomCard key={r.code} room={toRoomCard(r)} onSelect={() => setCode(r.code)} />
            ))}
          </div>
          {openRooms?.length === 0 && (
            <EmptyState
              icon={<Search />}
              title="No open rooms right now"
              description="Every public room is either full or already in session — check back soon, or start your own."
            />
          )}
        </div>
      </div>
    </WebShell>
  );
}
