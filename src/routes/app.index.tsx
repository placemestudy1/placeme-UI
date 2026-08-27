/**
 * Renders the PlaceMe mobile app's home tab: a greeting with streak/best
 * score badges, a "start a topic" card, the three room-entry actions, and
 * open rooms to join — all fetched from the real backend.
 *
 * - NativeHome(): main route component; renders the mobile home screen.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Dice5, Flame, KeyRound, PenLine, PlusCircle, Shuffle, Trophy } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { PmAvatar, PmBadge, PmButton, PmCard, SectionTitle } from "@/components/pm/kit";
import { ActionRow, RoomCard } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { getMyHistory, listOpenRooms, type HistorySession, type OpenRoom } from "@/lib/api";
import { computeStreak } from "@/lib/session/stats";
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

// Main route component: renders the mobile home tab with a greeting, the
// start-a-topic card, the three room-entry actions, and real open rooms.
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

  const bestScore = useMemo(() => {
    const scores = (sessions ?? []).flatMap((s) => (s.score != null ? [s.score] : []));
    return scores.length > 0 ? Math.max(...scores) : null;
  }, [sessions]);
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
          <PmAvatar initials={firstName.slice(0, 2).toUpperCase()} size="sm" />
        </div>
      }
    >
      <div className="space-y-5">
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

        <PmCard className="p-4">
          <SectionTitle title="Start a topic" />
          <div className="flex flex-col gap-2.5">
            <PmButton asChild block>
              <Link to="/app/new">
                <Dice5 /> Generate AI topic
              </Link>
            </PmButton>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              OR
              <div className="h-px flex-1 bg-border" />
            </div>
            <Link
              to="/app/new"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground"
            >
              <PenLine className="size-4" /> Write your own topic…
            </Link>
          </div>
        </PmCard>

        <div className="space-y-2.5">
          <ActionRow icon={PlusCircle} title="Create a Room" to="/app/new" />
          <ActionRow icon={Shuffle} title="Random Match" to="/app/match" />
          <ActionRow icon={KeyRound} title="Join by Code" to="/app/join" />
        </div>

        <div>
          <SectionTitle
            title="Open rooms nearby"
            action={
              <Link to="/app/join" className="text-xs font-semibold text-primary">
                See all
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
      </div>
    </NativeTabScreen>
  );
}
