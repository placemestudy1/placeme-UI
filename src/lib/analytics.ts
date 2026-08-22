import posthog from "posthog-js";

// Thin, consent-safe wrapper around PostHog for the funnel Phase 4 of
// ACTION_PLAN.md wants reported on (consent -> join -> completion ->
// feedback -> rating).
//
// Exports:
// - initAnalytics: initializes PostHog once, client-side only. A no-op
//   without VITE_POSTHOG_KEY configured -- analytics is optional, never a
//   hard requirement (unlike supabase-client.ts's Supabase config, which
//   throws without it).
// - identifyUser / resetAnalytics: links events to a signed-in user, and
//   clears that link on sign-out.
// - track: fires one of the named funnel events below.
//
// Redaction by construction, not by filtering: autocapture, pageview
// capture, and session replay are all off, so the SDK only ever sees
// exactly what the `track()` calls below pass it. AnalyticsEvent's own
// property shapes are the enforcement mechanism -- every property is a
// fact (an id, a count, a boolean, a score), never transcript lines,
// feedback prose, or other free-typed user content, so there's no
// "redact this field" step that could be missed. If a future event
// genuinely needs a piece of user-authored text, that's a deliberate,
// reviewed addition to the type below, not something a caller can pass
// in unnoticed.
const KEY = import.meta.env["VITE_POSTHOG_KEY"];
const HOST = import.meta.env["VITE_POSTHOG_HOST"] || "https://us.i.posthog.com";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined" || !KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    respect_dnt: true,
    person_profiles: "identified_only",
    // Free on PostHog's same plan (100K exceptions/month) -- basic crash
    // visibility for the pilot without adding a second vendor.
    capture_exceptions: true,
  });
  initialized = true;
}

// Links subsequent events to this signed-in user.
export function identifyUser(userId: string) {
  if (!initialized) return;
  posthog.identify(userId);
}

// Clears the current user link (call on sign-out) so events from the next
// signed-in session on this device aren't attributed to the previous user.
export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}

type AnalyticsEvent =
  | { name: "consent_granted" }
  | {
      name: "room_created";
      properties: { roomId: string; durationSeconds: number; visibility: "public" | "private" };
    }
  | { name: "room_joined"; properties: { roomId: string; method: "code" | "match" } }
  | { name: "session_started"; properties: { roomId: string } }
  | { name: "session_completed"; properties: { roomId: string } }
  | { name: "session_left_early"; properties: { roomId: string } }
  | { name: "feedback_viewed"; properties: { roomId: string; hasScore: boolean } }
  | { name: "feedback_rated"; properties: { roomId: string; rating: boolean } };

export function track(event: AnalyticsEvent) {
  if (!initialized) return;
  posthog.capture(event.name, "properties" in event ? event.properties : undefined);
}
