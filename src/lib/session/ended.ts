// Shared "session ended" resource fetching for both the web
// (`/ended/$roomId`) and native (`/app/ended`) screens (SCRUM-27, align
// end-state UX with server finality). Extracted so retry/error/empty
// handling for each of the three independently-arriving resources
// (feedback, transcript, participants) lives in exactly one place, same
// "shared session/* helper" pattern as stats.ts/history.ts.
//
// Exports:
// - useEndedSessionResources: polls room status/feedback once each, and
//   the transcript/participants once each, exposing a loading/error/retry
//   triple for every one of them plus the rating actions.
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getMyFeedback,
  getRoomParticipants,
  getRoomStatus,
  getRoomTranscript,
  rateFeedback,
  type FeedbackDimension,
  type FeedbackResult,
  type RoomParticipant,
  type RoomStatus,
  type TranscriptLine,
} from "@/lib/api";

const POLL_INTERVAL_MS = 3000;
const MAX_FEEDBACK_POLLS = 40;

export interface UseEndedSessionResourcesOptions {
  // Web-only analytics hooks -- the native screen doesn't call track().
  onFeedbackViewed?: (score: number | null) => void;
  onRated?: (rating: boolean) => void;
}

export function useEndedSessionResources(
  session: Session | null,
  roomId: string,
  { onFeedbackViewed, onRated }: UseEndedSessionResourcesOptions = {},
) {
  const [status, setStatus] = useState<RoomStatus | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackFailed, setFeedbackFailed] = useState(false);
  const [checkingFeedback, setCheckingFeedback] = useState(false);
  const [rating, setRating] = useState<boolean | null>(null);
  const [ratingReason, setRatingReason] = useState("");
  const [savingRating, setSavingRating] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState<FeedbackDimension[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);

  const [transcript, setTranscript] = useState<TranscriptLine[] | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    getRoomStatus(session, roomId)
      .then(setStatus)
      .catch(() => {});
  }, [session, roomId]);

  // Applies a feedback/mine result if it's actually ready yet; returns
  // whether it was, so the bounded poll below knows to stop.
  function applyFeedbackResult(r: FeedbackResult): boolean {
    if (!r.feedback) return false;
    setFeedback(r.feedback);
    setScore(r.score);
    setDimensions(r.dimensions);
    setStrengths(r.strengths);
    setImprovements(r.improvements);
    if (r.rating !== undefined) setRating(r.rating);
    if (r.ratingReason) setRatingReason(r.ratingReason);
    setFeedbackFailed(false);
    onFeedbackViewed?.(r.score);
    return true;
  }

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
          if (!cancelled && applyFeedbackResult(r)) clearInterval(interval);
        })
        .catch(() => {});
    }
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFeedbackViewed is a per-render analytics callback, not a dependency to re-poll on.
  }, [session, roomId]);

  // Manual retry once the bounded poll above gives up. gd-proto's own sweep
  // keeps retrying feedback generation server-side for up to 24h
  // (roomSweep.js's FEEDBACK_RETRY_MAX_AGE_MS), so a single fresh check can
  // still succeed long after this client's poll exhausted.
  function checkFeedbackAgain() {
    setCheckingFeedback(true);
    return getMyFeedback(session, roomId)
      .then((r) => applyFeedbackResult(r))
      .catch(() => false)
      .finally(() => setCheckingFeedback(false));
  }

  function fetchTranscript() {
    setTranscriptError(null);
    return getRoomTranscript(session, roomId)
      .then((r) => setTranscript(r.lines))
      .catch((e: Error) => setTranscriptError(e.message));
  }
  useEffect(() => {
    if (roomId) fetchTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTranscript is stable per (session, roomId); re-created each render but only ever called here or from a user click.
  }, [session, roomId]);

  function fetchParticipants() {
    setParticipantsError(null);
    return getRoomParticipants(session, roomId)
      .then((r) => setParticipants(r.participants))
      .catch((e: Error) => setParticipantsError(e.message));
  }
  useEffect(() => {
    if (roomId) fetchParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchParticipants is stable per (session, roomId); re-created each render but only ever called here or from a user click.
  }, [session, roomId]);

  async function submitRating(nextRating: boolean) {
    setSavingRating(true);
    try {
      await rateFeedback(session, roomId, {
        rating: nextRating,
        reason: ratingReason || undefined,
      });
      setRating(nextRating);
      onRated?.(nextRating);
    } catch {
      /* surfaced implicitly by rating not updating */
    } finally {
      setSavingRating(false);
    }
  }

  function commitReason() {
    const trimmed = ratingReason.trim();
    if (rating !== null && trimmed) {
      rateFeedback(session, roomId, { rating, reason: trimmed }).catch(() => {});
    }
  }

  return {
    status,
    feedback,
    feedbackFailed,
    checkingFeedback,
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
    retryTranscript: fetchTranscript,
    participants,
    participantsError,
    retryParticipants: fetchParticipants,
  };
}
