import { queryOptions } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { getConsentStatus } from "./api";

// The shared React Query cache entry for GET /api/consent/status, one per
// user. useConsentStatus reads it when the access token carries no consent
// claim; login fetches through it; sign-out clears it (auth-context).
// Kept in its own module so auth-context and use-consent-status can both
// import it without importing each other.
//
// Exports:
// - consentStatusQueryKeyRoot / consentStatusQueryKey: the cache keys.
// - consentStatusQueryOptions: key + fetcher + staleTime for a session.

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
