import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import {
  attestAdult as attestAdultApi,
  getConsentStatus,
  grantConsent as grantConsentApi,
} from "./api";
import { useAuth } from "./auth-context";
import { readConsentClaims, type ConsentClaims } from "./consent-claims";
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
// That entry also overrides a claim when refresh() fetched it *because*
// that token's claim was stale (reissuing failed, timed out, or kept
// returning the pre-change claim); a token issued after that takes over
// again.
//
// Client-side routing/UI only: the server's consentGate re-checks consent
// from the database for the LiveKit token mint and never reads the claim.
// How long refresh() waits for a reissued token before falling back to a
// status fetch. supabase-js retries a refresh that fails on the network for
// up to ~30s; a student who just granted consent shouldn't wait on that. A
// token that arrives later still takes over (it's newer than the fetch).
export const SESSION_REFRESH_TIMEOUT_MS = 4000;

// The consent state a change should produce, e.g. { canEnableMic: true }
// after a grant; refresh() uses it to recognise a reissued token whose
// claim predates the change.
export type ConsentExpectation = Partial<Pick<ConsentClaims, "canEnableMic" | "ageAttested">>;

function meetsExpectation(claims: ConsentClaims, expected: ConsentExpectation) {
  return (
    (expected.canEnableMic === undefined || claims.canEnableMic === expected.canEnableMic) &&
    (expected.ageAttested === undefined || claims.ageAttested === expected.ageAttested)
  );
}

export function useConsentStatus(session: Session | null) {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();
  const claims = readConsentClaims(session?.access_token);
  const query = useQuery({ ...consentStatusQueryOptions(session), enabled: !!session && !claims });
  const queryKey = consentStatusQueryKey(session?.user?.id);

  const supersededAt = query.data?.supersedesTokenIssuedAtMs;
  const claimsSuperseded =
    !!claims && supersededAt !== undefined && claims.issuedAtMs <= supersededAt;
  const useClaims = !!session && !!claims && !claimsSuperseded;

  // Reissues the access token; null if that fails, throws, or takes longer
  // than SESSION_REFRESH_TIMEOUT_MS.
  async function reissueToken(): Promise<Session | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), SESSION_REFRESH_TIMEOUT_MS);
    });
    try {
      return await Promise.race([refreshSession(), timedOut]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Brings consent state up to date after a change, resolving once it is.
  // Reissues the token so its claim reflects the change. supabase-js hands
  // concurrent refresh callers the same in-flight request, so a reissue can
  // return a token minted *before* the change (e.g. /consent's own on-arrival
  // check, or an auto-refresh, still in flight) -- when the claim doesn't
  // show the `expected` outcome, it tries once more. If there's still no
  // up-to-date claim (refresh failed/timed out, or the hook isn't enabled),
  // it fetches the status from the server and marks it as superseding every
  // token seen so far. Never throws: the change itself already succeeded,
  // and a failed status read just leaves the previous state in place.
  async function refresh(expected: ConsentExpectation = {}) {
    if (!session) return;
    let latest: Session | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const reissued = await reissueToken();
      if (!reissued) break;
      latest = reissued;
      const reissuedClaims = readConsentClaims(reissued.access_token);
      if (!reissuedClaims) break;
      if (meetsExpectation(reissuedClaims, expected)) {
        queryClient.removeQueries({ queryKey });
        return;
      }
    }

    const current = latest ?? session;
    const supersedes = Math.max(
      claims?.issuedAtMs ?? 0,
      readConsentClaims(current.access_token)?.issuedAtMs ?? 0,
    );
    await queryClient
      .fetchQuery({
        queryKey,
        staleTime: 0,
        queryFn: async () => ({
          ...(await getConsentStatus(current)),
          ...(supersedes ? { supersedesTokenIssuedAtMs: supersedes } : {}),
        }),
      })
      .catch(() => {});
  }

  async function grantConsent() {
    if (!session) throw new Error("Not signed in");
    await grantConsentApi(session);
    await refresh({ canEnableMic: true });
  }

  async function confirmAdult() {
    if (!session) throw new Error("Not signed in");
    await attestAdultApi(session);
    await refresh({ ageAttested: true });
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
