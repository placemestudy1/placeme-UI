import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Mic, Settings2 } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import {
  Banner,
  PmBadge,
  PmButton,
  PmCard,
  PmDialog,
  SectionTitle,
  StatusDot,
} from "@/components/pm/kit";
import { ParticipantTile } from "@/components/pm/blocks";
import { participants, topics } from "@/lib/demo";

export const Route = createFileRoute("/lobby")({
  head: () => ({
    meta: [
      { title: "Room lobby · PlaceMe" },
      {
        name: "description",
        content: "Wait with your group, check your mic and review the topic before the GD starts.",
      },
      { property: "og:title", content: "Room lobby · PlaceMe" },
      { property: "og:description", content: "Your group discussion starts in a moment." },
    ],
  }),
  component: LobbyPage,
});

function LobbyPage() {
  const [open, setOpen] = useState(false);
  return (
    <WebShell
      title="Room lobby"
      subtitle="GD-4821 · starts automatically when 6 of 8 seats are filled"
      actions={
        <PmButton variant="outline" onClick={() => setOpen(true)}>
          <Settings2 /> Audio settings
        </PmButton>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <PmCard glass className="p-6 md:p-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <PmBadge tone="live">
                  <StatusDot status="live" /> Starting in 00:42
                </PmBadge>
                <h2 className="mt-3 text-xl font-bold md:text-2xl">{topics[0]}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Panel-style GD. Moderator opens, each speaker gets 90 seconds, then free debate.
                  Cite data where possible.
                </p>
              </div>
              <span className="shrink-0 rounded-xl bg-secondary px-3 py-2 font-mono text-sm">
                GD-4821
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <PmButton asChild size="lg">
                <Link to="/session">
                  <Mic /> Join audio
                </Link>
              </PmButton>
              <PmButton variant="outline" size="lg">
                <Copy /> Copy invite link
              </PmButton>
              <PmButton asChild variant="ghost" size="lg">
                <Link to="/">Leave</Link>
              </PmButton>
            </div>
          </PmCard>

          <div>
            <SectionTitle title="Participants" subtitle="6 of 8 seats filled" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {participants.map((p) => (
                <ParticipantTile key={p.id} p={p} />
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <Banner
            tone="info"
            title="Ground rules"
            description="Don't interrupt mid-sentence, back claims with data, and give quieter members room. Interruptions lower your listening score."
          />
          <PmCard className="p-5">
            <SectionTitle title="Your setup" />
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Microphone</span>
                <StatusDot status="speaking" label="Ready" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Network</span>
                <StatusDot status="speaking" label="42 ms" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transcript</span>
                <PmBadge tone="primary">Enabled</PmBadge>
              </div>
            </div>
          </PmCard>
        </aside>
      </div>

      <PmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Audio settings"
        description="Changes apply to this session only."
        sheetOnMobile
        footer={
          <>
            <PmButton variant="ghost" block onClick={() => setOpen(false)}>
              Cancel
            </PmButton>
            <PmButton block onClick={() => setOpen(false)}>
              Save
            </PmButton>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            Input <span className="text-foreground">MacBook Pro Microphone</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            Output <span className="text-foreground">AirPods Pro</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            Noise suppression <span className="text-foreground">High</span>
          </div>
        </div>
      </PmDialog>
    </WebShell>
  );
}