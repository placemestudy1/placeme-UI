import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, PlusCircle, Shuffle, Sparkles } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { PmButton, PmCard, SectionTitle, PmBadge, EmptyState } from "@/components/pm/kit";
import { ProgressChart, RoomCard, SessionRow, StatCard } from "@/components/pm/blocks";
import { stats, type Session, type Room } from "@/lib/demo";
import { useAuth } from "@/lib/auth-context";
import { getMyHistory, listOpenRooms, type HistorySession, type OpenRoom } from "@/lib/api";

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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home · PlaceMe — Live GD practice for engineering students" },
      {
        name: "description",
        content:
          "Join live voice group discussions, collaborate in real time and get AI feedback after every session.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  ),
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function toSessionRow(s: HistorySession): Session {
  return {
    id: s.id,
    topic: s.topicText ?? "Untitled discussion",
    date: s.startedAt ? dateFormatter.format(new Date(s.startedAt)) : "Not started yet",
    duration: `${Math.round(s.durationSeconds / 60)} min`,
    code: s.code,
    // BE-19: real score once BE-6/BE-7 has produced one -- "Analyzed" is
    // now only a genuine fallback (feedback generated, score not, e.g. a
    // pre-migration row), not the everyday case.
    score: s.score ?? undefined,
    status: s.status === "ended" && s.feedback ? "Analyzed" : "Processing",
  };
}

function Index() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [recent, setRecent] = useState<HistorySession[] | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoom[] | null>(null);

  useEffect(() => {
    getMyHistory(session)
      .then((r) => setRecent(r.sessions.slice(0, 3)))
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    listOpenRooms(session)
      .then((r) => setOpenRooms(r.rooms.slice(0, 4)))
      .catch(() => setOpenRooms([]));
  }, [session]);

  const displayName =
    (user?.user_metadata?.["display_name"] as string | undefined) || user?.email || "there";
  const firstName = (displayName.split(" ")[0] ?? displayName).split("@")[0] ?? displayName;

  return (
    <WebShell
      title={`Welcome back, ${firstName}`}
      // MOCK — streak/level-matched-rooms copy, see docs/BACKEND_REQUIREMENTS.md#BE-9 #BE-1
      subtitle="You're on a 12-day streak. Two rooms match your practice level right now."
      actions={
        <PmButton asChild>
          <Link to="/rooms/new">
            <PlusCircle /> New room
          </Link>
        </PmButton>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <PmCard glass className="overflow-hidden p-6 md:p-8">
            <PmBadge tone="accent">
              <Sparkles className="size-3" /> Random match is fastest
            </PmBadge>
            <h2 className="mt-4 max-w-lg text-2xl font-bold md:text-3xl">
              Get placed in a live GD in under 30 seconds
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              We pair you with other students, run a timed discussion, then get you individual AI
              feedback.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PmButton asChild size="lg">
                <Link to="/match">
                  <Shuffle /> Find a match
                </Link>
              </PmButton>
              <PmButton asChild variant="outline" size="lg">
                <Link to="/join">Join with code</Link>
              </PmButton>
            </div>
          </PmCard>

          {/* MOCK — avg score / speak time / streak have no backend source yet, see BE-9 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          <div>
            <SectionTitle
              title="Rooms open now"
              action={
                <PmButton asChild variant="ghost" size="sm">
                  <Link to="/join">
                    Browse all <ArrowRight />
                  </Link>
                </PmButton>
              }
            />
            <div className="grid gap-4 md:grid-cols-2">
              {openRooms === null && <p className="text-sm text-muted-foreground">Loading…</p>}
              {openRooms?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No public rooms open right now — start your own.
                </p>
              )}
              {openRooms?.map((r) => (
                <RoomCard
                  key={r.code}
                  room={toRoomCard(r)}
                  onSelect={() => navigate({ to: "/join" })}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          {/* MOCK — score trend needs a real score first, see BE-8/BE-6 */}
          <PmCard className="p-5">
            <SectionTitle title="Score trend" subtitle="Last 6 weeks" />
            <ProgressChart />
          </PmCard>
          <PmCard className="p-5">
            <SectionTitle
              title="Recent sessions"
              action={
                <PmButton asChild variant="ghost" size="sm">
                  <Link to="/history">All</Link>
                </PmButton>
              }
            />
            <div className="space-y-3">
              {recent === null && <p className="text-sm text-muted-foreground">Loading…</p>}
              {recent?.length === 0 && (
                <p className="text-sm text-muted-foreground">No sessions yet.</p>
              )}
              {recent?.map((s) => (
                <SessionRow key={s.id} s={toSessionRow(s)} to={`/ended/${s.id}`} />
              ))}
            </div>
          </PmCard>
          <PmCard className="p-5">
            <SectionTitle title="Invites" />
            <EmptyState
              icon={<Sparkles />}
              title="No pending invites"
              description="Share your room code with classmates to practice together."
              className="border-0 bg-transparent px-0 py-6"
            />
          </PmCard>
        </aside>
      </div>
    </WebShell>
  );
}
