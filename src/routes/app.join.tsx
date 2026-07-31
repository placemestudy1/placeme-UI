import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { CardSkeleton, PmButton, PmCard, PmInput } from "@/components/pm/kit";
import { RoomCard } from "@/components/pm/blocks";
import { liveRooms } from "@/lib/demo";

export const Route = createFileRoute("/app/join")({
  head: () => ({
    meta: [
      { title: "Join · PlaceMe Mobile" },
      { name: "description", content: "Enter a room code or browse open GD rooms on mobile." },
      { property: "og:title", content: "Join a room · PlaceMe Mobile" },
      { property: "og:description", content: "Tap in with a 4-digit room code." },
    ],
  }),
  component: NativeJoin,
});

function NativeJoin() {
  const digits = ["4", "8", "2", "1"];
  return (
    <NativeTabScreen title="Join">
      <div className="space-y-5 pb-4">
        <PmCard glass className="p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Room code</p>
          <div className="mt-3 flex justify-center gap-2.5">
            {digits.map((d, i) => (
              <span
                key={i}
                className="grid size-14 place-items-center rounded-2xl border border-input bg-surface font-mono text-2xl font-bold"
              >
                {d}
              </span>
            ))}
          </div>
          <PmButton asChild block size="lg" className="mt-5">
            <Link to="/app/lobby">Join room</Link>
          </PmButton>
        </PmCard>

        <PmInput placeholder="Search topics or hosts" icon={<Search />} />

        <div className="space-y-3">
          {liveRooms.map((r) => (
            <RoomCard key={r.code} room={r} to="/app/lobby" />
          ))}
          <CardSkeleton />
        </div>
      </div>
    </NativeTabScreen>
  );
}