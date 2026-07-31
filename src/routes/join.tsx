import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Ticket } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { Field, PmButton, PmCard, PmInput, SectionTitle, CardSkeleton } from "@/components/pm/kit";
import { RoomCard } from "@/components/pm/blocks";
import { liveRooms } from "@/lib/demo";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join a room · PlaceMe" },
      {
        name: "description",
        content: "Enter a room code or browse open group discussions to join right now.",
      },
      { property: "og:title", content: "Join a GD room · PlaceMe" },
      { property: "og:description", content: "Browse open rooms or join instantly with a code." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  return (
    <WebShell title="Join a room" subtitle="4 rooms open · 23 students practicing right now">
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <PmCard glass className="h-fit p-6">
          <SectionTitle title="Have a code?" subtitle="Ask the host for the 4-digit room code" />
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Field label="Room code">
              <PmInput
                placeholder="GD-0000"
                icon={<Ticket />}
                defaultValue="GD-4821"
                className="font-mono tracking-[0.2em]"
              />
            </Field>
            <PmButton asChild block size="lg">
              <Link to="/lobby">Join room</Link>
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
            {liveRooms.map((r) => (
              <RoomCard key={r.code} room={r} />
            ))}
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    </WebShell>
  );
}