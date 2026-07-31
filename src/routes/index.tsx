import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PlusCircle, Shuffle, Sparkles } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { PmButton, PmCard, SectionTitle, PmBadge, EmptyState } from "@/components/pm/kit";
import { ProgressChart, RoomCard, SessionRow, StatCard } from "@/components/pm/blocks";
import { currentUser, history, liveRooms, stats } from "@/lib/demo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home · PlaceMe — Live GD practice for engineering students" },
      {
        name: "description",
        content:
          "Join live voice group discussions, collaborate in real time and get AI feedback after every session.",
      },
      { property: "og:title", content: "PlaceMe — Live GD practice with AI feedback" },
      {
        property: "og:description",
        content: "Practice group discussions with peers and get scored AI feedback instantly.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <WebShell
      title={`Welcome back, ${currentUser.name.split(" ")[0]}`}
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
              We pair you with 5 peers at your level, run a timed discussion, then score your
              content, clarity, confidence, listening and fluency.
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
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          <div>
            <SectionTitle
              title="Rooms open now"
              subtitle="Curated for CSE placement season"
              action={
                <PmButton asChild variant="ghost" size="sm">
                  <Link to="/join">
                    Browse all <ArrowRight />
                  </Link>
                </PmButton>
              }
            />
            <div className="grid gap-4 md:grid-cols-2">
              {liveRooms.map((r) => (
                <RoomCard key={r.code} room={r} />
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
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
              {history.slice(0, 3).map((s) => (
                <SessionRow key={s.id} s={s} />
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
