import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Share2 } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import {
  FeedbackList,
  PmBadge,
  PmButton,
  PmCard,
  ScoreBar,
  ScoreRing,
  SectionTitle,
  TranscriptLineItem,
} from "@/components/pm/kit";
import {
  feedbackImprovements,
  feedbackScores,
  feedbackStrengths,
  topics,
  transcript,
} from "@/lib/demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/ended")({
  head: () => ({
    meta: [
      { title: "Feedback · PlaceMe Mobile" },
      { name: "description", content: "Your AI feedback and transcript for the last session." },
      { property: "og:title", content: "Session feedback · PlaceMe Mobile" },
      { property: "og:description", content: "Scores, strengths and fixes after every GD." },
    ],
  }),
  component: NativeEnded,
});

function NativeEnded() {
  const [tab, setTab] = useState<"feedback" | "transcript">("feedback");
  return (
    <NativeStackScreen
      title="Session feedback"
      backTo="/app/history"
      backLabel="History"
      right={
        <button className="text-primary-glow">
          <Share2 className="size-4" />
        </button>
      }
      footer={
        <PmButton asChild block size="lg">
          <Link to="/app/match">Practice again</Link>
        </PmButton>
      }
    >
      <div className="space-y-5 px-5 py-5">
        <PmCard glass className="flex flex-col items-center p-5 text-center">
          <ScoreRing score={78} size={116} />
          <PmBadge tone="success" className="mt-3">
            +6 vs last session
          </PmBadge>
          <p className="mt-3 text-sm font-semibold leading-snug">{topics[0]}</p>
          <p className="mt-1 text-xs text-muted-foreground">Jul 30, 2026 · 22 min · 6 speakers</p>
        </PmCard>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          {(["feedback", "transcript"] as const).map((t) => (
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

        {tab === "feedback" ? (
          <>
            <PmCard className="space-y-4 p-4">
              <SectionTitle title="Score breakdown" />
              {feedbackScores.map((s) => (
                <ScoreBar key={s.label} {...s} />
              ))}
            </PmCard>
            <FeedbackList title="What worked" items={feedbackStrengths} />
            <FeedbackList title="Fix next time" items={feedbackImprovements} tone="warning" />
          </>
        ) : (
          <div className="space-y-5">
            {transcript.map((t) => (
              <TranscriptLineItem key={t.id} {...t} self={t.speaker === "Aarav Menon"} />
            ))}
          </div>
        )}
      </div>
    </NativeStackScreen>
  );
}