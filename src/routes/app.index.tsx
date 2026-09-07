/**
 * Renders the PlaceMe mobile app's home tab: a greeting with streak, a
 * quick-match call to action, at-a-glance stats, open rooms to join, and
 * recent session history — all fetched from the real backend.
 *
 * - NativeHome(): main route component; renders the mobile home screen.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronRight, Shield, Shuffle, Sparkles } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { PmAvatar, PmBadge, PmButton, PmCard, SectionTitle } from "@/components/pm/kit";
import { ProgressChart, RoomCard, SessionRow, StatCard } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { getMyHistory, listOpenRooms, type HistorySession, type OpenRoom } from "@/lib/api";
import { average, computeStreak } from "@/lib/session/stats";
import { dateFormatter } from "@/lib/session/formatting";
import { buildScoreTrend, toSessionRow } from "@/lib/session/history";
import { toRoomCard } from "@/lib/session/rooms";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "PlaceMe Mobile — Home" },
      {
        name: "description",
        content: "The PlaceMe mobile app: join live GDs and get AI feedback from your phone.",
      },
      { property: "og:title", content: "PlaceMe Mobile — Home" },
      { property: "og:description", content: "Native iOS and Android experience for GD practice." },
    ],
  }),
  component: () => (
    <ProtectedRoute redirectTo="/app/login" consentRedirectTo="/app/consent">
      <NativeHome />
    </ProtectedRoute>
  ),
});

// Main route component: renders the mobile home tab with a greeting, quick
// match CTA, real stats grid, real open rooms, and real recent history.
function NativeHome() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<HistorySession[] | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoom[] | null>(null);

  useEffect(() => {
    getMyHistory(session)
      .then((r) => setSessions(r.sessions))
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    listOpenRooms(session)
      .then((r) => setOpenRooms(r.rooms.slice(0, 3)))
      .catch(() => setOpenRooms([]));
  }, [session]);

  const recent = sessions?.slice(0, 2) ?? null;
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

  const displayName =
    (user?.user_metadata?.["display_name"] as string | undefined) || user?.email || "there";
  const firstName = (displayName.split(" ")[0] ?? displayName).split("@")[0] ?? displayName;

  return (
    <NativeTabScreen
      title={`Hey, ${firstName}`}
      right={
        <div className="flex items-center gap-2">
          <button className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground">
            <Bell className="size-4" />
          </button>
          <Link
            to="/app/account"
            aria-label="Privacy & your data"
            className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground"
          >
            <Shield className="size-4" />
          </Link>
          <PmAvatar initials={firstName.slice(0, 2).toUpperCase()} size="sm" />
        </div>
      }
    >
      <div className="space-y-5">
        <PmCard glass className="p-5">
          <PmBadge tone="accent">
            <Sparkles className="size-3" /> {streak > 0 ? `${streak}-day streak` : "Get started"}
          </PmBadge>
          <p className="mt-3 text-lg font-bold leading-snug">Ready for today's discussion round?</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {streak > 0 ? "Keep your streak going." : "Start your first streak today."}
          </p>
          <PmButton asChild block size="lg" className="mt-4">
            <Link to="/app/match">
              <Shuffle /> Quick match
            </Link>
          </PmButton>
        </PmCard>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Sessions" value={sessions ? String(sessions.length) : "…"} />
          <StatCard label="Avg. score" value={avgScore != null ? String(avgScore) : "—"} />
          <StatCard label="Speak time" value={avgTalkShare != null ? `${avgTalkShare}%` : "—"} />
          <StatCard
            label="Streak"
            value={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "—"}
          />
        </div>

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

        <div>
          <SectionTitle
            title="Open rooms"
            action={
              <Link
                to="/app/join"
                className="flex items-center text-xs font-semibold text-primary-glow"
              >
                See all <ChevronRight className="size-3.5" />
              </Link>
            }
          />
          <div className="space-y-3">
            {openRooms === null && <p className="text-sm text-muted-foreground">Loading…</p>}
            {openRooms?.length === 0 && (
              <p className="text-sm text-muted-foreground">No public rooms open right now.</p>
            )}
            {openRooms?.map((r) => (
              <RoomCard
                key={r.code}
                room={toRoomCard(r)}
                onSelect={() => navigate({ to: "/app/join" })}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionTitle title="Recent" />
          <div className="space-y-3">
            {recent === null && <p className="text-sm text-muted-foreground">Loading…</p>}
            {recent?.length === 0 && (
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
            )}
            {recent?.map((s) => (
              <SessionRow
                key={s.id}
                s={toSessionRow(s, dateFormatter)}
                to="/app/ended"
                search={{ roomId: s.id }}
              />
            ))}
          </div>
        </div>
      </div>
    </NativeTabScreen>
  );
}
