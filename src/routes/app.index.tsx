/**
 * Renders the PlaceMe mobile app's home tab: a greeting with streak badge, a
 * quick-match call to action, at-a-glance stats, open rooms to join, and
 * recent session history.
 *
 * - NativeHome(): main route component; renders the mobile home screen.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, ChevronRight, Shuffle, Sparkles } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { PmAvatar, PmBadge, PmButton, PmCard, SectionTitle } from "@/components/pm/kit";
import { RoomCard, SessionRow, StatCard } from "@/components/pm/blocks";
import { currentUser, history, liveRooms, stats } from "@/lib/demo";

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
  component: NativeHome,
});

// Main route component: renders the mobile home tab with a greeting, quick
// match CTA, stats grid, open rooms, and recent session history.
function NativeHome() {
  return (
    <NativeTabScreen
      title={`Hey, ${currentUser.name.split(" ")[0]}`}
      right={
        <div className="flex items-center gap-2">
          <button className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground">
            <Bell className="size-4" />
          </button>
          <PmAvatar initials={currentUser.initials} size="sm" />
        </div>
      }
    >
      <div className="space-y-5">
        <PmCard glass className="p-5">
          <PmBadge tone="accent">
            <Sparkles className="size-3" /> 12-day streak
          </PmBadge>
          <p className="mt-3 text-lg font-bold leading-snug">Ready for today's discussion round?</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Average match time right now: 24 seconds.
          </p>
          <PmButton asChild block size="lg" className="mt-4">
            <Link to="/app/match">
              <Shuffle /> Quick match
            </Link>
          </PmButton>
        </PmCard>

        <div className="grid grid-cols-2 gap-3">
          {stats.slice(0, 4).map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

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
            {liveRooms.slice(0, 3).map((r) => (
              <RoomCard key={r.code} room={r} to="/app/lobby" />
            ))}
          </div>
        </div>

        <div>
          <SectionTitle title="Recent" />
          <div className="space-y-3">
            {history.slice(0, 2).map((s) => (
              <SessionRow key={s.id} s={s} to="/app/ended" />
            ))}
          </div>
        </div>
      </div>
    </NativeTabScreen>
  );
}
