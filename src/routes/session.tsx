import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Hand, Mic, MicOff, PhoneOff, ScrollText, Users } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import {
  LiveCaption,
  PmBadge,
  PmButton,
  PmCard,
  PmDialog,
  SectionTitle,
  StatusDot,
  TranscriptLineItem,
} from "@/components/pm/kit";
import { ParticipantTile, TimerPill } from "@/components/pm/blocks";
import { participants, topics, transcript } from "@/lib/demo";

export const Route = createFileRoute("/session")({
  head: () => ({
    meta: [
      { title: "Live session · PlaceMe" },
      {
        name: "description",
        content: "Live voice group discussion with real-time transcript and speaking analytics.",
      },
      { property: "og:title", content: "Live GD session · PlaceMe" },
      { property: "og:description", content: "Speak, listen and get scored in real time." },
    ],
  }),
  component: SessionPage,
});

function SessionPage() {
  const [muted, setMuted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  return (
    <WebShell>
      <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PmBadge tone="live">
              <StatusDot status="live" /> Live
            </PmBadge>
            <span className="font-mono text-xs text-muted-foreground">GD-4821</span>
          </div>
          <h1 className="mt-2 truncate text-xl font-bold md:text-2xl">{topics[0]}</h1>
        </div>
        <TimerPill />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {participants.map((p) => (
              <ParticipantTile key={p.id} p={p} />
            ))}
          </div>

          <LiveCaption text="Aarav: …roughly a third of postings mention AI tooling explicitly, so pair fundamentals with demonstrable delivery." />

          <PmCard className="sticky bottom-24 flex flex-wrap items-center justify-center gap-3 p-4 md:bottom-6">
            <PmButton
              variant={muted ? "secondary" : "primary"}
              size="pill"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? <MicOff /> : <Mic />}
            </PmButton>
            <PmButton variant="secondary" size="pill" aria-label="Raise hand">
              <Hand />
            </PmButton>
            <PmButton variant="secondary" size="pill" aria-label="Participants">
              <Users />
            </PmButton>
            <PmButton variant="secondary" size="pill" aria-label="Transcript">
              <ScrollText />
            </PmButton>
            <PmButton variant="danger" size="pill" aria-label="Leave" onClick={() => setLeaving(true)}>
              <PhoneOff />
            </PmButton>
          </PmCard>
        </div>

        <aside className="space-y-4">
          <PmCard className="p-5">
            <SectionTitle title="Live transcript" subtitle="Auto-tagged by the AI coach" />
            <div className="no-scrollbar max-h-[520px] space-y-5 overflow-y-auto pr-1">
              {transcript.map((t) => (
                <TranscriptLineItem key={t.id} {...t} self={t.speaker === "Aarav Menon"} />
              ))}
            </div>
          </PmCard>
          <PmCard className="p-5">
            <SectionTitle title="Your speak time" />
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold">26%</span>
              <span className="text-xs text-accent">Healthy range</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[26%] rounded-full bg-[image:var(--gradient-primary)]" />
            </div>
          </PmCard>
        </aside>
      </div>

      <PmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Leave the discussion?"
        description="You've spoken for 3 of 8 minutes. Leaving early means no AI feedback for this session."
        sheetOnMobile
        footer={
          <>
            <PmButton variant="ghost" block onClick={() => setLeaving(false)}>
              Stay
            </PmButton>
            <PmButton asChild variant="danger" block>
              <Link to="/ended">Leave</Link>
            </PmButton>
          </>
        }
      />
    </WebShell>
  );
}