import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, RotateCcw, Share2, ThumbsDown, ThumbsUp } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
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
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import {
  getMyFeedback,
  getRoomParticipants,
  getRoomStatus,
  getRoomTranscript,
  rateFeedback,
  type FeedbackDimension,
  type RoomParticipant,
  type RoomStatus,
  type TranscriptLine,
} from "@/lib/api";

export const Route = createFileRoute("/ended/$roomId")({
  head: () => ({
    meta: [
      { title: "Session feedback · PlaceMe" },
      {
        name: "description",
        content: "Your individual AI feedback and the full transcript.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <EndedPage />
    </ProtectedRoute>
  ),
});

const POLL_INTERVAL_MS = 3000;
const MAX_FEEDBACK_POLLS = 40;

// Picks the lowest-scoring real feedback dimension, so the "suggested next
// topic" card targets an actual weak spot instead of a fixed placeholder.
function weakestDimension(dims: FeedbackDimension[]): FeedbackDimension | null {
  if (dims.length === 0) return null;
  return dims.reduce((min, d) => (d.score < min.score ? d : min));
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ORDINAL_WORDS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];
function ordinalWord(rank: number) {
  return ORDINAL_WORDS[rank - 1] ?? `${rank}th`;
}

// Builds the talk-time headline from real BE-10 participant shares instead
// of a fixed mock sentence -- ranks the caller among the room's speakers by
// talkShare and describes their position relative to the most active one.
function talkTimeSummary(participants: RoomParticipant[], selfUserId: string | undefined) {
  if (!selfUserId || participants.length === 0) return null;
  const sorted = [...participants].sort((a, b) => b.talkShare - a.talkShare);
  const rank = sorted.findIndex((p) => p.userId === selfUserId);
  if (rank === -1) return null;

  const self = sorted[rank]!;
  if (sorted.length === 1) {
    return {
      talkShare: self.talkShare,
      headline: `You were the only tracked speaker, at ${self.talkShare}% talk time.`,
    };
  }
  if (rank === 0) {
    const runnerUp = sorted[1]!;
    return {
      talkShare: self.talkShare,
      headline: `You led the discussion at ${self.talkShare}% talk time, ahead of ${runnerUp.displayName} at ${runnerUp.talkShare}%.`,
    };
  }
  const leader = sorted[0]!;
  return {
    talkShare: self.talkShare,
    headline: `You were the ${ordinalWord(rank + 1)}-most active speaker at ${self.talkShare}% talk time, behind ${leader.displayName} at ${leader.talkShare}%.`,
  };
}

function EndedPage() {
  const { roomId } = Route.useParams();
  const { session, user } = useAuth();

  const [status, setStatus] = useState<RoomStatus | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackFailed, setFeedbackFailed] = useState(false);
  const [rating, setRating] = useState<boolean | null>(null);
  const [ratingReason, setRatingReason] = useState("");
  const [savingRating, setSavingRating] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[] | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  // BE-6/BE-7 (SPEC-0006): real structured feedback, replacing the
  // feedbackScores/feedbackStrengths/feedbackImprovements demo fixtures.
  // score stays null (never a fabricated 0) for a pre-migration row or the
  // transcription-failed stub -- both have empty dimensions/strengths/
  // improvements too, so the rubric/lists simply don't render for those.
  const [score, setScore] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState<FeedbackDimension[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);

  useEffect(() => {
    getRoomStatus(session, roomId)
      .then(setStatus)
      .catch(() => {});
  }, [session, roomId]);

  useEffect(() => {
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
          track({ name: "feedback_viewed", properties: { roomId, hasScore: r.score != null } });
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
    getRoomTranscript(session, roomId)
      .then((r) => setTranscript(r.lines))
      .catch(() => {});
  }, [session, roomId]);

  // BE-10: real participants + their talk-time share, replacing the
  // fixture list this card used to render unconditionally.
  useEffect(() => {
    getRoomParticipants(session, roomId)
      .then((r) => setParticipants(r.participants))
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
      track({ name: "feedback_rated", properties: { roomId, rating: nextRating } });
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
    <WebShell
      title="Session ended"
      subtitle={
        status ? `${status.code} · ${Math.round(status.durationSeconds / 60)} min` : "Loading…"
      }
      actions={
        <>
          <PmButton variant="outline" onClick={shareReport}>
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
          <PmCard className="space-y-3 p-6">
            <SectionTitle title="Your feedback" />
            {feedback ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{feedback}</p>
            ) : feedbackFailed ? (
              <p className="text-sm text-muted-foreground">
                Your feedback is taking longer than expected. It'll appear under History once it's
                ready.
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
                  aria-label="Feedback was useful"
                  aria-pressed={rating === true}
                  disabled={savingRating}
                  onClick={() => submitRating(true)}
                >
                  <ThumbsUp />
                </PmButton>
                <PmButton
                  variant={rating === false ? "primary" : "outline"}
                  size="iconSm"
                  aria-label="Feedback was not useful"
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
                    className="min-w-48 flex-1"
                  />
                )}
              </div>
            )}
          </PmCard>

          {/*
            BE-6/BE-7 (SPEC-0006): score is real (gd-proto's structured
            Gemini feedback). No delta-vs-last-session badge -- that needs
            BE-8 score history, which doesn't exist yet; showing a fabricated
            number would be worse than showing none. The talk-time headline
            below is derived from BE-10's live participants/talkShare data.
          */}
          <PmCard glass className="grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] md:p-8">
            {score != null ? (
              <ScoreRing score={score} />
            ) : (
              <div className="grid size-[132px] place-items-center rounded-full border border-dashed border-border text-center text-xs text-muted-foreground">
                Score not available
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-bold">{status?.topicText ?? "This discussion"}</h2>
              {(() => {
                const summary = talkTimeSummary(participants, user?.id);
                return (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {summary
                        ? summary.headline
                        : "Talk-time breakdown will appear here once it's ready."}
                    </p>
                    {summary && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <PmBadge tone="primary">{summary.talkShare}% talk time</PmBadge>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </PmCard>
          {dimensions.length > 0 && (
            <PmCard className="space-y-5 p-6">
              <SectionTitle
                title="Score breakdown"
                subtitle="Weighted like a real placement panel"
              />
              {dimensions.map((d) => (
                <ScoreBar key={d.label} {...d} />
              ))}
            </PmCard>
          )}
          {(strengths.length > 0 || improvements.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {strengths.length > 0 && <FeedbackList title="What worked" items={strengths} />}
              {improvements.length > 0 && (
                <FeedbackList title="Fix next time" items={improvements} tone="warning" />
              )}
            </div>
          )}

          <PmCard className="p-6">
            <SectionTitle
              title="Full transcript"
              subtitle={transcript ? `${transcript.length} lines` : "Loading…"}
              action={
                <PmButton variant="ghost" size="sm">
                  <Download /> Export
                </PmButton>
              }
            />
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
          </PmCard>
        </div>

        <aside className="space-y-4">
          <PmCard className="p-5">
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
          <PmCard className="p-5">
            <SectionTitle title="Suggested next topic" />
            {(() => {
              const weak = weakestDimension(dimensions);
              return weak ? (
                <>
                  <p className="text-sm font-semibold">
                    Practice a topic that stretches your {weak.label.toLowerCase()}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Targets your lowest sub-score: {weak.label.toLowerCase()} ({weak.score}).
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete more sessions to get a personalized suggestion.
                </p>
              );
            })()}
            <PmButton asChild block className="mt-4">
              <Link to="/rooms/new">Create this room</Link>
            </PmButton>
          </PmCard>
        </aside>
      </div>
    </WebShell>
  );
}
