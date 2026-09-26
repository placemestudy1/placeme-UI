import { createFileRoute, Link } from "@tanstack/react-router";
import { RotateCcw, Share2, ThumbsDown, ThumbsUp } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  Banner,
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
import { beginEarlyLeaveEvaluation, useEarlyLeaveEvaluation } from "@/lib/early-leave-evaluation";
import { useEndedSessionResources } from "@/lib/session/ended";
import type { FeedbackDimension, RoomParticipant } from "@/lib/api";

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
function talkTimeSummary(participants: RoomParticipant[] | null, selfUserId: string | undefined) {
  if (!selfUserId || !participants || participants.length === 0) return null;
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
      headline: `You had the highest tracked talk-time share at ${self.talkShare}%, followed by ${runnerUp.displayName} at ${runnerUp.talkShare}%.`,
    };
  }
  const highestShareParticipant = sorted[0]!;
  return {
    talkShare: self.talkShare,
    headline: `Your tracked talk-time share ranked ${ordinalWord(rank + 1)} at ${self.talkShare}%. ${highestShareParticipant.displayName} had the highest tracked share at ${highestShareParticipant.talkShare}%.`,
  };
}

function EndedPage() {
  const { roomId } = Route.useParams();
  const { session, user } = useAuth();
  const earlyLeave = useEarlyLeaveEvaluation(session, roomId);

  const {
    status,
    feedback,
    feedbackFailed,
    checkingFeedback,
    checkFeedbackError,
    checkFeedbackAgain,
    rating,
    ratingReason,
    setRatingReason,
    savingRating,
    submitRating,
    commitReason,
    score,
    dimensions,
    strengths,
    improvements,
    transcript,
    transcriptError,
    retryTranscript,
    participants,
    participantsError,
    retryParticipants,
  } = useEndedSessionResources(session, roomId, {
    onFeedbackViewed: (s) =>
      track({ name: "feedback_viewed", properties: { roomId, hasScore: s != null } }),
    onRated: (r) => track({ name: "feedback_rated", properties: { roomId, rating: r } }),
  });

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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <PmCard className="space-y-3 p-6">
            <SectionTitle title="Your feedback" />
            {earlyLeave?.status === "failed" && !earlyLeave.accepted && (
              <div className="space-y-2 rounded-lg border border-destructive/40 p-3 text-sm">
                <p>We couldn't start your early-leave evaluation. Your exit was still completed.</p>
                <PmButton
                  variant="outline"
                  size="sm"
                  onClick={() => beginEarlyLeaveEvaluation(session, roomId).catch(() => {})}
                >
                  Retry evaluation
                </PmButton>
              </div>
            )}
            {earlyLeave?.status === "failed" && earlyLeave.accepted && (
              <p className="text-sm text-destructive">
                Your evaluation was accepted but could not be completed. Please try again later.
              </p>
            )}
            {earlyLeave?.status === "partial" && (
              <p className="text-sm text-muted-foreground">
                Feedback uses a partial transcript because the final audio did not finish flushing
                in time.
              </p>
            )}
            {earlyLeave && ["pending", "queued", "running"].includes(earlyLeave.status) && (
              <p className="text-sm text-muted-foreground">
                Your early-leave evaluation is pending. It will use only audio captured before the
                cutoff.
              </p>
            )}
            {feedback ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{feedback}</p>
            ) : feedbackFailed ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your feedback is taking longer than expected. It'll appear under History once it's
                  ready.
                </p>
                <PmButton
                  variant="outline"
                  size="sm"
                  loading={checkingFeedback}
                  disabled={checkingFeedback}
                  onClick={() => checkFeedbackAgain()}
                >
                  Check again
                </PmButton>
                {checkFeedbackError && (
                  <p className="text-sm text-destructive">
                    Couldn't reach the server to check ({checkFeedbackError}). Try again.
                  </p>
                )}
              </div>
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
          <PmCard
            glass
            className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] md:p-8"
          >
            {score != null ? (
              <ScoreRing score={score} />
            ) : (
              <div className="grid size-[132px] place-items-center rounded-full border border-dashed border-border text-center text-xs text-muted-foreground">
                Score not available
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-bold">{status?.topicText ?? "This discussion"}</h2>
              {participantsError ? (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-destructive">
                    Couldn't load participants: {participantsError}
                  </p>
                  <PmButton variant="outline" size="sm" onClick={() => retryParticipants()}>
                    Retry
                  </PmButton>
                </div>
              ) : (
                (() => {
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
                })()
              )}
            </div>
          </PmCard>
          {dimensions.length > 0 && (
            <PmCard className="space-y-5 p-6">
              <SectionTitle
                title="Score breakdown"
                subtitle="Based on PlaceMe's current AI evaluation rubric"
              />
              {dimensions.map((d) => (
                <ScoreBar key={d.label} {...d} />
              ))}
            </PmCard>
          )}
          {(strengths.length > 0 || improvements.length > 0) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            />
            {transcriptError ? (
              <Banner
                tone="danger"
                title="Couldn't load the transcript"
                description={transcriptError}
                action={
                  <PmButton variant="outline" size="sm" onClick={() => retryTranscript()}>
                    Retry
                  </PmButton>
                }
              />
            ) : transcript && transcript.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transcript was recorded for this session.
              </p>
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
          </PmCard>
        </div>

        <aside className="space-y-4">
          <PmCard className="p-5">
            <SectionTitle title="Talk-time split" />
            {participantsError ? (
              <p className="text-sm text-muted-foreground">Unavailable — see error above.</p>
            ) : participants === null ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participant data available yet.</p>
            ) : (
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
            )}
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
                  No score-based suggestion is available yet. Choose a general practice topic for
                  your next session.
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
