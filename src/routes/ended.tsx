import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, RotateCcw, Share2 } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
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
  participants,
  topics,
  transcript,
} from "@/lib/demo";

export const Route = createFileRoute("/ended")({
  head: () => ({
    meta: [
      { title: "Session feedback · PlaceMe" },
      {
        name: "description",
        content: "Your individual AI feedback: scores, strengths, fixes and the full transcript.",
      },
      { property: "og:title", content: "Session feedback · PlaceMe" },
      { property: "og:description", content: "See how you performed in your last group discussion." },
    ],
  }),
  component: EndedPage,
});

function EndedPage() {
  return (
    <WebShell
      title="Session ended"
      subtitle="GD-4821 · Jul 30, 2026 · 22 min · 6 participants"
      actions={
        <>
          <PmButton variant="outline">
            <Share2 /> Share
          </PmButton>
          <PmButton asChild>
            <Link to="/match">
              <RotateCcw /> Practice again
            </Link>
          </PmButton>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <PmCard glass className="grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] md:p-8">
            <ScoreRing score={78} />
            <div className="min-w-0">
              <PmBadge tone="success">+6 vs your last session</PmBadge>
              <h2 className="mt-3 text-xl font-bold">{topics[0]}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You were the second-most active speaker at 26% talk time, opened the framing the
                group adopted, and cited two verifiable data points. Filler words are the single
                biggest score leak.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <PmBadge tone="primary">26% talk time</PmBadge>
                <PmBadge tone="warning">18 filler words</PmBadge>
                <PmBadge tone="accent">2 data citations</PmBadge>
              </div>
            </div>
          </PmCard>

          <PmCard className="space-y-5 p-6">
            <SectionTitle title="Score breakdown" subtitle="Weighted like a real placement panel" />
            {feedbackScores.map((s) => (
              <ScoreBar key={s.label} {...s} />
            ))}
          </PmCard>

          <div className="grid gap-4 md:grid-cols-2">
            <FeedbackList title="What worked" items={feedbackStrengths} />
            <FeedbackList title="Fix next time" items={feedbackImprovements} tone="warning" />
          </div>

          <PmCard className="p-6">
            <SectionTitle
              title="Full transcript"
              subtitle="7 turns · 22 minutes"
              action={
                <PmButton variant="ghost" size="sm">
                  <Download /> Export
                </PmButton>
              }
            />
            <div className="space-y-5">
              {transcript.map((t) => (
                <TranscriptLineItem key={t.id} {...t} self={t.speaker === "Aarav Menon"} />
              ))}
            </div>
          </PmCard>
        </div>

        <aside className="space-y-4">
          <PmCard className="p-5">
            <SectionTitle title="Talk-time split" />
            <div className="space-y-3">
              {participants.map((p) => (
                <div key={p.id}>
                  <div className="flex justify-between text-xs">
                    <span className="truncate">{p.name}</span>
                    <span className="font-mono text-muted-foreground">{p.talkShare}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${p.talkShare * 3}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </PmCard>
          <PmCard className="p-5">
            <SectionTitle title="Suggested next topic" />
            <p className="text-sm font-semibold">{topics[3]}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Targets your lowest sub-score: fluency under pressure.
            </p>
            <PmButton asChild block className="mt-4">
              <Link to="/rooms/new">Create this room</Link>
            </PmButton>
          </PmCard>
        </aside>
      </div>
    </WebShell>
  );
}