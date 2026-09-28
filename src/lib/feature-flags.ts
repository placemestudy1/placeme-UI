import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";

import { supabase } from "./supabase-client";

// W1-4 (SCRUM-91): feature flags from gd-proto's `feature_flags` table
// (migration 0039), read straight from Supabase (anyone may read it), so a
// flag flips for students within FEATURE_FLAGS_STALE_TIME_MS of the row
// changing, with no deploy. The server checks the same rows and answers 404
// for a flagged-off feature's API.
//
// Fails closed: while the flags load, if they can't be read (e.g. 0039 isn't
// applied yet), or if a flag has no row, it counts as off.
//
// Exports:
// - fetchFeatureFlags / featureFlagsQueryOptions: the read, cached per QueryClient.
// - isFlagOn: pure check against a flags map.
// - useFeatureFlags / useFeatureFlag: hooks for components.
// - requireFeatureFlag: for a route's beforeLoad; throws notFound() while off.
// - visibleNavItems: drops nav entries whose flag is off.

export type FeatureFlags = Readonly<Record<string, boolean>>;

export const FEATURE_FLAGS_STALE_TIME_MS = 30_000;

export async function fetchFeatureFlags(): Promise<FeatureFlags> {
  const { data, error } = await supabase.from("feature_flags").select("key, enabled");
  if (error) throw error;
  const rows = (data ?? []) as { key: string; enabled: boolean | null }[];
  return Object.fromEntries(rows.map((row) => [row.key, row.enabled === true]));
}

export const featureFlagsQueryOptions = queryOptions({
  queryKey: ["feature-flags"] as const,
  queryFn: fetchFeatureFlags,
  staleTime: FEATURE_FLAGS_STALE_TIME_MS,
  retry: 1,
});

export function isFlagOn(flags: FeatureFlags | undefined, key: string): boolean {
  return flags?.[key] === true;
}

export function useFeatureFlags(): FeatureFlags | undefined {
  return useQuery(featureFlagsQueryOptions).data;
}

export function useFeatureFlag(key: string): boolean {
  return isFlagOn(useFeatureFlags(), key);
}

// Use in a flagged route: beforeLoad: ({ context }) => requireFeatureFlag(context.queryClient, "mcq").
// A flagged-off route renders the app's 404 page, as if it didn't exist.
export async function requireFeatureFlag(queryClient: QueryClient, key: string): Promise<void> {
  let flags: FeatureFlags | undefined;
  try {
    flags = await queryClient.ensureQueryData(featureFlagsQueryOptions);
  } catch {
    flags = undefined;
  }
  if (!isFlagOn(flags, key)) throw notFound();
}

export function visibleNavItems<T extends { flag?: string }>(
  items: readonly T[],
  flags: FeatureFlags | undefined,
): T[] {
  return items.filter((item) => item.flag === undefined || isFlagOn(flags, item.flag));
}
