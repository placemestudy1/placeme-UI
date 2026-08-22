/**
 * Post-session feedback screen for the native/mobile app — shows the
 * student's real AI-generated score and feedback for a group discussion,
 * with a tab to switch over to the full session transcript.
 *
 * Unlike the real web `/ended/$roomId`, this is a flat route — the room is
 * identified by a `roomId` search param instead (see app.lobby.tsx).
 *
 * - NativeEnded(): main route component — polls for real feedback and
 *   renders the score summary and a tabbed feedback/transcript view.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Share2, ThumbsDown, ThumbsUp } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  FeedbackList,
  PmBadge,
  PmButton,
  PmCard,
  PmInput,
  ScoreBar,
  ScoreRing,
  SectionTitle,
  TranscriptLineItem,
} from "@/components/pm/kit";
import { topics } from "@/lib/demo";
import { useAuth } from "@/lib/auth-context";
import {
  getMyFeedback,
  getRoomStatus,
  getRoomTranscript,
  getRoomParticipants,
  rateFeedback,
  type FeedbackDimension,
  type RoomStatus,
  type TranscriptLine,
  type RoomParticipant,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ roomId: z.string().optional() });

export const Route = createFileRoute("/app/ended")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Feedback · PlaceMe Mobile" },
      { name: "description", content: "Your AI feedback and transcript for the last session." },
      { property: "og:title", content: "Session feedback · PlaceMe Mobile" },
      { property: "og:description", content: "Scores, strengths and fixes after every GD." },
    ],
  }),
  component: () => (
    <ProtectedRoute redirectTo="/app/login" consentRedirectTo="/app/consent">
      <NativeEnded />
    </ProtectedRoute>
  ),
});

const POLL_INTERVAL_MS = 3000;
const MAX_FEEDBACK_POLLS = 40;

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Main "session ended" screen: polls for real feedback, shows the score
// ring and feedback breakdown, and a toggle to view the full transcript.
function NativeEnded() {
  const { roomId: rawRoomId } = Route.useSearch();
  const roomId = rawRoomId ?? "";
  const { session } = useAuth();

  const [tab, setTab] = useState<"feedback" | "transcript">("feedback");
  const [status, setStatus] = useState<RoomStatus | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackFailed, setFeedbackFailed] = useState(false);
  const [rating, setRating] = useState<boolean | null>(null);
  const [ratingReason, setRatingReason] = useState("");
  const [savingRating, setSavingRating] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[] | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState<FeedbackDimension[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId) return;
    getRoomParticipants(session, roomId)
      .then((r) => setParticipants(r.participants))
      .catch(() => {});
  }, [session, roomId]);

  useEffect(() => {
    if (!roomId) return;
    getRoomStatus(session, roomId)
      .then(setStatus)
      .catch(() => {});
  }, [session, roomId]);

  useEffect(() => {
    if (!roomId) return undefined;
    let cancelled = false;
    let attempts = 0;
    function poll() {
      if (attempts++ >= MAX_FEEDBACK_POLLS) {
        clearInterval(interval);
        if (!cancelled) setFeedbackFailed(true);
        return;
      }
      getMyFeedback(session, roomId)
        .then((r) => {
          if (cancelled || !r.feedback) return;
          setFeedback(r.feedback);
          setScore(r.score);
          setDimensions(r.dimensions);
          setStrengths(r.strengths);
          setImprovements(r.improvements);
          if (r.rating !== undefined) setRating(r.rating);
          if (r.ratingReason) setRatingReason(r.ratingReason);
          clearInterval(interval);
        })
        .catch(() => {});
    }
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, roomId]);

  useEffect(() => {
    if (!roomId) return;
    getRoomTranscript(session, roomId)
      .then((r) => setTranscript(r.lines))
      .catch(() => {});
  }, [session, roomId]);

  async function submitRating(nextRating: boolean) {
    setSavingRating(true);
    try {
      await rateFeedback(session, roomId, {
        rating: nextRating,
        reason: ratingReason || undefined,
      });
      setRating(nextRating);
    } catch {
      /* surfaced implicitly by rating not updating */
    } finally {
      setSavingRating(false);
    }
  }

  function commitReason() {
    const trimmed = ratingReason.trim();
    if (rating !== null && trimmed)
      rateFeedback(session, roomId, { rating, reason: trimmed }).catch(() => {});
  }

  async function shareReport() {
    const text = `PlaceMe GD report — ${status?.topicText ?? "session"} (${status?.code ?? roomId})\n\n${feedback ?? "Feedback pending."}`;
    await navigator.clipboard?.writeText(text);
  }

  return (
    <NativeStackScreen
      title="Session feedback"
      backTo="/app/history"
      backLabel="History"
      right={
        <button className="text-primary-glow" onClick={shareReport}>
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
          {score != null ? (
            <ScoreRing score={score} size={116} />
          ) : (
            <div className="grid size-[116px] place-items-center rounded-full border border-dashed border-border text-center text-xs text-muted-foreground">
              Score not available
            </div>
          )}
          <p className="mt-3 text-sm font-semibold leading-snug">
            {status?.topicText ?? "This discussion"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {status
              ? `${status.code} · ${Math.round(status.durationSeconds / 60)} min`
              : "Loading…"}
          </p>
        </PmCard>

        <PmCard className="space-y-3 p-4">
          <SectionTitle title="Your feedback" />
          {feedback ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{feedback}</p>
          ) : feedbackFailed ? (
            <p className="text-sm text-muted-foreground">
              Your feedback is taking longer than expected. Check back soon.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Generating your feedback…</p>
          )}
          {feedback && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <span className="text-sm font-medium">Was this useful?</span>
              <PmButton
                variant={rating === true ? "primary" : "outline"}
                size="iconSm"
                aria-pressed={rating === true}
                disabled={savingRating}
                onClick={() => submitRating(true)}
              >
                <ThumbsUp />
              </PmButton>
              <PmButton
                variant={rating === false ? "primary" : "outline"}
                size="iconSm"
                aria-pressed={rating === false}
                disabled={savingRating}
                onClick={() => submitRating(false)}
              >
                <ThumbsDown />
              </PmButton>
              {rating !== null && (
                <PmInput
                  placeholder="One line on why (optional)"
                  value={ratingReason}
                  onChange={(e) => setRatingReason(e.target.value)}
                  onBlur={commitReason}
                  className="min-w-40 flex-1"
                />
              )}
            </div>
          )}
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
            {dimensions.length > 0 && (
              <PmCard className="space-y-4 p-4">
                <SectionTitle title="Score breakdown" />
                {dimensions.map((d) => (
                  <ScoreBar key={d.label} {...d} />
                ))}
              </PmCard>
            )}
            {strengths.length > 0 && <FeedbackList title="What worked" items={strengths} />}
            {improvements.length > 0 && (
              <FeedbackList title="Fix next time" items={improvements} tone="warning" />
            )}

            <PmCard className="p-4">
              <SectionTitle title="Talk-time split" />
              <div className="space-y-3">
                {participants.map((p) => (
                  <div key={p.userId}>
                    <div className="flex justify-between text-xs">
                      <span className="truncate">{p.displayName}</span>
                      <span className="font-mono text-muted-foreground">{p.talkShare}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${p.talkShare}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </PmCard>

            <PmCard className="p-4">
              <SectionTitle title="Suggested next topic" />
              <p className="text-sm font-semibold">{topics[3]}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Targets your lowest sub-score: fluency under pressure.
              </p>
              <PmButton asChild block className="mt-4">
                <Link to="/app/new">Create this room</Link>
              </PmButton>
            </PmCard>
          </>
        ) : (
          <div className="space-y-5">
            {(transcript ?? []).map((t, i) => (
              <TranscriptLineItem
                key={i}
                speaker={t.displayName}
                initials={initialsFor(t.displayName)}
                time=""
                text={t.text}
              />
            ))}
          </div>
        )}
      </div>
    </NativeStackScreen>
  );
}
