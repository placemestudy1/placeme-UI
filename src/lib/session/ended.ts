// "Session ended" resource fetching for the `/ended/$roomId` screen
// (SCRUM-27, align end-state UX with server finality). Extracted so
// retry/error/empty
// handling for each of the three independently-arriving resources
// (feedback, transcript, participants) lives in exactly one place, same
// "shared session/* helper" pattern as stats.ts/history.ts.
//
// Exports:
// - useEndedSessionResources: polls room status/feedback once each, and
//   the transcript/participants once each, exposing a loading/error/retry
//   triple for every one of them plus the rating actions.
import { useEffect, useRef, useState } from "react";
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
  // Optional analytics hooks, called when feedback is shown or rated.
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
  const [checkFeedbackError, setCheckFeedbackError] = useState<string | null>(null);
  const [rating, setRating] = useState<boolean | null>(null);
  const [ratingReason, setRatingReason] = useState("");
  const [savingRating, setSavingRating] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState<FeedbackDimension[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);

  const [transcript, setTranscript] = useState<TranscriptLine[] | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<RoomParticipant[] | null>(null);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  // checkFeedbackAgain/fetchTranscript/fetchParticipants are called both
  // from an effect (on mount) and directly from retry buttons -- a single
  // per-effect `cancelled` flag (as used elsewhere in this file) wouldn't
  // cover the button-triggered calls, so a ref that flips once on unmount
  // guards every setState call in all three instead.
  const mountedRef = useRef(true);
  useEffect(() => {
    // Reset (not just initialize via useRef) -- dev-mode double-invokes
    // this effect once per mount (setup, cleanup, setup again), and without
    // this the first synthetic cleanup would leave mountedRef false for
    // the rest of the component's real lifetime, silently dropping every
    // later setState call below.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
  //
  // SCRUM-27 (PR #12 review): a failed getMyFeedback call (network/5xx) used
  // to be swallowed via .catch(() => false), leaving the UI indistinguishable
  // from "feedback simply isn't ready yet" -- checkFeedbackError now
  // surfaces that distinctly so a retry-worthy failure doesn't read as an
  // still-generating state.
  function checkFeedbackAgain() {
    setCheckingFeedback(true);
    setCheckFeedbackError(null);
    return getMyFeedback(session, roomId)
      .then((r) => mountedRef.current && applyFeedbackResult(r))
      .catch((e: Error) => {
        if (mountedRef.current) setCheckFeedbackError(e.message || "Couldn't check for feedback.");
        return false;
      })
      .finally(() => mountedRef.current && setCheckingFeedback(false));
  }

  // SCRUM-27 (PR #12 review): each fetch now carries its own monotonic
  // request id so an older call resolving after a newer one can't overwrite
  // it with stale data. Deliberately "id >= last applied", not "id ===
  // latest issued": `session` starts null and hydrates asynchronously
  // (auth-context.tsx), so this effect legitimately fires twice on mount
  // (once before, once after) -- both calls are real and each one's result
  // (error or success) should still land, just never out of order. Requiring
  // exact-latest-issued instead would silently drop the first call's result
  // the moment the second one starts, which is a real state (e.g. the
  // first's error), not staleness.
  const transcriptRequestIdRef = useRef(0);
  const transcriptAppliedIdRef = useRef(0);
  function fetchTranscript() {
    const requestId = ++transcriptRequestIdRef.current;
    setTranscriptError(null);
    return getRoomTranscript(session, roomId)
      .then((r) => {
        if (!mountedRef.current || requestId < transcriptAppliedIdRef.current) return;
        transcriptAppliedIdRef.current = requestId;
        setTranscript(r.lines);
      })
      .catch((e: Error) => {
        if (!mountedRef.current || requestId < transcriptAppliedIdRef.current) return;
        transcriptAppliedIdRef.current = requestId;
        setTranscriptError(e.message);
      });
  }
  useEffect(() => {
    if (roomId) fetchTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTranscript is stable per (session, roomId); re-created each render but only ever called here or from a user click.
  }, [session, roomId]);

  const participantsRequestIdRef = useRef(0);
  const participantsAppliedIdRef = useRef(0);
  function fetchParticipants() {
    const requestId = ++participantsRequestIdRef.current;
    setParticipantsError(null);
    return getRoomParticipants(session, roomId)
      .then((r) => {
        if (!mountedRef.current || requestId < participantsAppliedIdRef.current) return;
        participantsAppliedIdRef.current = requestId;
        setParticipants(r.participants);
      })
      .catch((e: Error) => {
        if (!mountedRef.current || requestId < participantsAppliedIdRef.current) return;
        participantsAppliedIdRef.current = requestId;
        setParticipantsError(e.message);
      });
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
    retryTranscript: fetchTranscript,
    participants,
    participantsError,
    retryParticipants: fetchParticipants,
  };
}
