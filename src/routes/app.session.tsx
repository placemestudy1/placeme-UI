import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Hand, Mic, MicOff, PhoneOff, ScrollText } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import {
  LiveCaption,
  PmBadge,
  PmButton,
  PmDialog,
  StatusDot,
  TranscriptLineItem,
} from "@/components/pm/kit";
import { ParticipantTile, TimerPill } from "@/components/pm/blocks";
import { participants, topics, transcript } from "@/lib/demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/session")({
  head: () => ({
    meta: [
      { title: "Live session · PlaceMe Mobile" },
      { name: "description", content: "Live voice GD with real-time captions on mobile." },
      { property: "og:title", content: "Live session · PlaceMe Mobile" },
      { property: "og:description", content: "Speak, listen and get scored in real time." },
    ],
  }),
  component: NativeSession,
});

function NativeSession() {
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<"room" | "transcript">("room");
  const [leaving, setLeaving] = useState(false);

  return (
    <NativeStackScreen
      bare
      footer={
        <div className="flex items-center justify-between gap-2">
          <PmButton
            variant={muted ? "secondary" : "primary"}
            size="pill"
            aria-label="Toggle mic"
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? <MicOff /> : <Mic />}
          </PmButton>
          <PmButton variant="secondary" size="pill" aria-label="Raise hand">
            <Hand />
          </PmButton>
          <PmButton
            variant="secondary"
            size="pill"
            aria-label="Transcript"
            onClick={() => setTab(tab === "room" ? "transcript" : "room")}
          >
            <ScrollText />
          </PmButton>
          <PmButton
            variant="danger"
            size="pill"
            aria-label="Leave"
            onClick={() => setLeaving(true)}
          >
            <PhoneOff />
          </PmButton>
        </div>
      }
    >
      <div className="flex items-center justify-between px-5 pb-3">
        <PmBadge tone="live">
          <StatusDot status="live" /> Live · GD-4821
        </PmBadge>
        <TimerPill />
      </div>
      <div className="px-5">
        <h1 className="text-base font-bold leading-snug">{topics[0]}</h1>
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          {(["room", "transcript"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg py-2 text-xs font-semibold capitalize transition-colors",
                tab === t ? "bg-card text-foreground" : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {tab === "room" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {participants.map((p) => (
                <ParticipantTile key={p.id} p={p} compact />
              ))}
            </div>
            <LiveCaption text="Aarav: …a third of postings mention AI tooling explicitly, so pair fundamentals with delivery." />
          </>
        ) : (
          <div className="space-y-5">
            {transcript.map((t) => (
              <TranscriptLineItem key={t.id} {...t} self={t.speaker === "Aarav Menon"} />
            ))}
          </div>
        )}
      </div>

      <PmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Leave the discussion?"
        description="Leaving early means no AI feedback for this session."
        sheetOnMobile
        footer={
          <>
            <PmButton variant="ghost" block onClick={() => setLeaving(false)}>
              Stay
            </PmButton>
            <PmButton asChild variant="danger" block>
              <Link to="/app/ended">Leave</Link>
            </PmButton>
          </>
        }
      />
    </NativeStackScreen>
  );
}