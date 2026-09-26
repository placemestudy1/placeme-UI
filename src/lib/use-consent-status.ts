import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import {
  attestAdult as attestAdultApi,
  getConsentStatus,
  grantConsent as grantConsentApi,
} from "./api";

// Hook for tracking whether this user can enable their mic.
//
// Exports:
// - useConsentStatus: exposes consent status (canEnableMic, ageAttested,
//   loading, error), plus refresh/grantConsent/confirmAdult actions.
// - consentStatusQueryKey / consentStatusQueryOptions: the shared React
//   Query cache entry behind it, for callers that fetch outside the hook
//   (login prefill) or clear it (sign-out).
//
// Mirrors gd-proto/apps/web/src/consent/useConsentStatus.js. Any screen about
// to enable a mic should check `canEnableMic` here first — false until the
// student has granted the current consent version. `ageAttested` is a
// separate, independent gate (SCRUM-24 follow-up): audio-sharing consent
// alone was never adult-eligibility evidence.
//
// Backed by one React Query entry per user rather than per-component state:
// every route mounts its own ProtectedRoute (plus WebShell's nav check), so
// component-local state meant a fresh GET /api/consent/status -- and a
// "Checking your consent status…" gate -- on every page navigation. Keyed on
// the user id, not the Session object, so Supabase's background token
// refresh (a new Session reference) doesn't refetch either. Grant, attest
// and withdraw invalidate the entry; focus/reconnect refetch it once stale,
// so a change made in another tab is still picked up.

// How long a fetched status is served from cache before a refetch.
const CONSENT_STALE_TIME_MS = 5 * 60 * 1000;

// Prefix shared by every user's entry, for clearing them all on sign-out.
export const consentStatusQueryKeyRoot = ["consent-status"] as const;

export const consentStatusQueryKey = (userId: string | undefined) =>
  [...consentStatusQueryKeyRoot, userId ?? null] as const;

export const consentStatusQueryOptions = (session: Session | null) =>
  queryOptions({
    queryKey: consentStatusQueryKey(session?.user?.id),
    queryFn: () => getConsentStatus(session),
    enabled: !!session,
    staleTime: CONSENT_STALE_TIME_MS,
  });

export function useConsentStatus(session: Session | null) {
  const queryClient = useQueryClient();
  const query = useQuery(consentStatusQueryOptions(session));
  const queryKey = consentStatusQueryKey(session?.user?.id);

  // Resolves once the refetch finishes, so callers awaiting a grant see the
  // updated status straight after.
  const refresh = () => queryClient.invalidateQueries({ queryKey });

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

  return {
    canEnableMic: query.data?.canEnableMic ?? false,
    ageAttested: query.data?.ageAttested ?? false,
    // Only true until the first result: a background refetch of cached data
    // doesn't flash callers back into a loading state.
    loading: query.isPending,
    error: query.error ? query.error.message : null,
    grantConsent,
    confirmAdult,
    refresh,
  };
}
