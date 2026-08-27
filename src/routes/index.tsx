import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Dice5,
  Flame,
  KeyRound,
  PenLine,
  PlusCircle,
  Shuffle,
  Sparkles,
  Trophy,
} from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { PmButton, PmCard, SectionTitle, PmBadge, EmptyState } from "@/components/pm/kit";
import { ActionRow, ProgressChart, RoomCard, SessionRow } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { getMyHistory, listOpenRooms, type HistorySession, type OpenRoom } from "@/lib/api";
import { average, computeStreak } from "@/lib/session/stats";
import { dateFormatter } from "@/lib/session/formatting";
import { buildScoreTrend, toSessionRow } from "@/lib/session/history";
import { toRoomCard } from "@/lib/session/rooms";

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

function Index() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<HistorySession[] | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoom[] | null>(null);

  useEffect(() => {
    getMyHistory(session)
      .then((r) => setSessions(r.sessions))
      .catch(() => {});
  }, [session]);

  const recent = sessions?.slice(0, 3) ?? null;
  const scoreTrend = useMemo(() => buildScoreTrend(sessions ?? []), [sessions]);
  const bestScore = useMemo(() => {
    const scores = (sessions ?? []).flatMap((s) => (s.score != null ? [s.score] : []));
    return scores.length > 0 ? Math.max(...scores) : null;
  }, [sessions]);
  const streak = useMemo(() => computeStreak(sessions ?? []), [sessions]);

  useEffect(() => {
    listOpenRooms(session)
      .then((r) => setOpenRooms(r.rooms.slice(0, 3)))
      .catch(() => setOpenRooms([]));
  }, [session]);

  const displayName =
    (user?.user_metadata?.["display_name"] as string | undefined) || user?.email || "there";
  const firstName = (displayName.split(" ")[0] ?? displayName).split("@")[0] ?? displayName;

  return (
    <WebShell title={`Ready to practice, ${firstName}?`}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {streak > 0 && (
              <PmBadge tone="warning">
                <Flame className="size-3.5" /> {streak}-session streak
              </PmBadge>
            )}
            {bestScore != null && (
              <PmBadge tone="primary">
                <Trophy className="size-3.5" /> Best {bestScore}
              </PmBadge>
            )}
          </div>

          <PmCard className="p-6 md:p-8">
            <SectionTitle title="Start a topic" />
            <div className="flex flex-col gap-3">
              <PmButton asChild size="lg">
                <Link to="/rooms/new">
                  <Dice5 /> Generate AI topic
                </Link>
              </PmButton>
              <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                OR
                <div className="h-px flex-1 bg-border" />
              </div>
              <Link
                to="/rooms/new"
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/50"
              >
                <PenLine className="size-4" /> Write your own topic…
              </Link>
            </div>
          </PmCard>

          <div className="grid gap-3 sm:grid-cols-3">
            <ActionRow
              icon={PlusCircle}
              title="Create a Room"
              subtitle="Set topic, duration and visibility"
              to="/rooms/new"
            />
            <ActionRow
              icon={Shuffle}
              title="Random Match"
              subtitle="Get grouped with peers instantly"
              to="/match"
            />
            <ActionRow
              icon={KeyRound}
              title="Join by Code"
              subtitle="Enter a private room code"
              to="/join"
            />
          </div>

          <div>
            <SectionTitle
              title="Open rooms nearby"
              action={
                <PmButton asChild variant="ghost" size="sm">
                  <Link to="/join">See all</Link>
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
          <PmCard className="p-5">
            <SectionTitle title="Score trend" subtitle="Your last scored sessions" />
            {scoreTrend.length > 0 ? (
              <ProgressChart series={scoreTrend} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No scored sessions yet.
              </p>
            )}
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
                <SessionRow key={s.id} s={toSessionRow(s, dateFormatter)} to={`/ended/${s.id}`} />
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
