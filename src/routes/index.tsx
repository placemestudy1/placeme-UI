import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, PlusCircle, Shuffle, Sparkles } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { PmButton, PmCard, SectionTitle, PmBadge, EmptyState } from "@/components/pm/kit";
import { ProgressChart, RoomCard, SessionRow, StatCard } from "@/components/pm/blocks";
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
  const avgScore = useMemo(
    () => average((sessions ?? []).flatMap((s) => (s.score != null ? [s.score] : []))),
    [sessions],
  );
  const avgTalkShare = useMemo(
    () => average((sessions ?? []).flatMap((s) => (s.talkShare != null ? [s.talkShare] : []))),
    [sessions],
  );
  const streak = useMemo(() => computeStreak(sessions ?? []), [sessions]);

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
      // BE-9: real streak. The mock's second clause ("Two rooms match your
      // practice level right now") is dropped rather than kept fake --
      // there's no backend item that computes a level-matched-room count.
      subtitle={
        streak > 0
          ? `You're on a ${streak}-day streak. Keep it going!`
          : "Ready to start your first streak?"
      }
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

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Sessions" value={sessions ? String(sessions.length) : "…"} />
            <StatCard label="Avg. score" value={avgScore != null ? String(avgScore) : "—"} />
            <StatCard label="Speak time" value={avgTalkShare != null ? `${avgTalkShare}%` : "—"} />
            <StatCard
              label="Streak"
              value={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "—"}
            />
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
