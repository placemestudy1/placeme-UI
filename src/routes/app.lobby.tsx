import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Mic } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { Banner, PmBadge, PmButton, PmCard, SectionTitle, StatusDot } from "@/components/pm/kit";
import { ParticipantTile } from "@/components/pm/blocks";
import { participants, topics } from "@/lib/demo";

export const Route = createFileRoute("/app/lobby")({
  head: () => ({
    meta: [
      { title: "Lobby · PlaceMe Mobile" },
      { name: "description", content: "Wait for your group and check your mic before the GD." },
      { property: "og:title", content: "Room lobby · PlaceMe Mobile" },
      { property: "og:description", content: "Your discussion starts in a moment." },
    ],
  }),
  component: NativeLobby,
});

function NativeLobby() {
  return (
    <NativeStackScreen
      title="GD-4821"
      backTo="/app/join"
      backLabel="Rooms"
      right={
        <button className="text-primary-glow">
          <Copy className="size-4" />
        </button>
      }
      footer={
        <PmButton asChild block size="lg">
          <Link to="/app/session">
            <Mic /> Join audio
          </Link>
        </PmButton>
      }
    >
      <div className="space-y-5 px-5 py-5">
        <PmCard glass className="p-4">
          <PmBadge tone="live">
            <StatusDot status="live" /> Starting in 00:42
          </PmBadge>
          <h2 className="mt-3 text-lg font-bold leading-snug">{topics[0]}</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Moderator opens, 90 seconds each, then free debate. Cite data where possible.
          </p>
        </PmCard>

        <div>
          <SectionTitle title="Participants" subtitle="6 of 8 seats" />
          <div className="grid grid-cols-2 gap-3">
            {participants.map((p) => (
              <ParticipantTile key={p.id} p={p} compact />
            ))}
          </div>
        </div>

        <Banner
          tone="info"
          title="Ground rules"
          description="No mid-sentence interruptions. Give quieter members room — listening is scored."
        />
      </div>
    </NativeStackScreen>
  );
}