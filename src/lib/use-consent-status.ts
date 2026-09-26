import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { attestAdult as attestAdultApi, grantConsent as grantConsentApi } from "./api";
import { useAuth } from "./auth-context";
import { readConsentClaims } from "./consent-claims";
import { consentStatusQueryKey, consentStatusQueryOptions } from "./consent-status-query";

// Hook for tracking whether this user can enable their mic.
//
// Exports:
// - useConsentStatus: exposes consent status (canEnableMic, ageAttested,
//   loading, error, source), plus refresh/grantConsent/confirmAdult actions.
//
// Mirrors gd-proto/apps/web/src/consent/useConsentStatus.js. Any screen about
// to enable a mic should check `canEnableMic` here first — false until the
// student has granted the current consent version. `ageAttested` is a
// separate, independent gate (SCRUM-24 follow-up): audio-sharing consent
// alone was never adult-eligibility evidence.
//
// SPEC-0015: the primary source is the `placeme_consent` claim in the
// session's access token (consent-claims.ts), so every route's
// ProtectedRoute, the nav and the consent/account pages know the answer
// with no request at all. After a grant, attestation or withdrawal,
// refresh() reissues the token via AuthProvider.refreshSession(), so the
// claim -- and everything reading it -- updates immediately.
//
// Fallback: a token without the claim (issued before the hook was enabled)
// uses the shared, per-user GET /api/consent/status cache entry instead.
// That entry also overrides a claim when it was fetched after the token was
// issued -- the case where refreshing the token failed, so the claim is
// known to be older than the latest change.
//
// Client-side routing/UI only: the server's consentGate re-checks consent
// from the database for the LiveKit token mint and never reads the claim.
// How long refresh() waits for a reissued token before falling back to a
// status fetch. supabase-js retries a refresh that fails on the network for
// up to ~30s; a student who just granted consent shouldn't wait on that. A
// token that arrives later still takes over (it's newer than the fetch).
export const SESSION_REFRESH_TIMEOUT_MS = 4000;

export function useConsentStatus(session: Session | null) {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();
  const claims = readConsentClaims(session?.access_token);
  const query = useQuery({ ...consentStatusQueryOptions(session), enabled: !!session && !claims });
  const queryKey = consentStatusQueryKey(session?.user?.id);

  // `iat` has 1s resolution, so a fetch only counts as newer than the token
  // from the next whole second on -- a token issued in the same second as a
  // fetch is treated as the fresher of the two.
  const fetchedAfterClaims =
    !!claims && query.data !== undefined && query.dataUpdatedAt >= claims.issuedAtMs + 1000;
  const useClaims = !!session && !!claims && !fetchedAfterClaims;

  // Reissues the token so its claim reflects a change just made. If the new
  // token carries the claim, any fetched status is dropped (the claim is now
  // the newest); if the refresh failed, timed out or the token has no claim,
  // fetches the status fresh instead. Resolves once the new state is in
  // place.
  async function refresh() {
    if (!session) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), SESSION_REFRESH_TIMEOUT_MS);
    });
    const refreshed = await Promise.race([refreshSession(), timedOut]);
    clearTimeout(timer);
    if (refreshed && readConsentClaims(refreshed.access_token)) {
      queryClient.removeQueries({ queryKey });
      return;
    }
    await queryClient.fetchQuery({
      ...consentStatusQueryOptions(refreshed ?? session),
      staleTime: 0,
    });
  }

  async function grantConsent() {
    if (!session) throw new Error("Not signed in");
    await grantConsentApi(session);
    await refresh();
  }

  async function confirmAdult() {
    if (!session) throw new Error("Not signed in");
    await attestAdultApi(session);
    await refresh();
  }

  if (useClaims) {
    return {
      canEnableMic: claims.canEnableMic,
      ageAttested: claims.ageAttested,
      loading: false,
      error: null,
      source: "claims" as const,
      grantConsent,
      confirmAdult,
      refresh,
    };
  }

  return {
    canEnableMic: query.data?.canEnableMic ?? false,
    ageAttested: query.data?.ageAttested ?? false,
    // Only true until the first result: a background refetch of cached data
    // doesn't flash callers back into a loading state.
    loading: query.isPending,
    error: query.error ? query.error.message : null,
    source: "server" as const,
    grantConsent,
    confirmAdult,
    refresh,
  };
}
