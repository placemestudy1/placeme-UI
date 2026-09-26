import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { PmButton } from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";
import { useConsentStatus } from "@/lib/use-consent-status";

// Auth + consent gate for pages that require a signed-in, consented user.
//
// Exports:
// - ProtectedRoute: renders children once signed in and consented, a
//   loading state while either is resolving, and redirects to /login or
//   /consent otherwise.
//
// Mirrors gd-proto/apps/web/src/auth/ProtectedRoute.jsx, extended with a
// consent check: that legacy component (and this one, until now) only
// checked auth, so a returning user whose session restores from storage
// (page refresh, new tab, coming back later) landed straight on a protected
// page with no consent prompt — the only place that checked consent was the
// one-off login-form submit handler in routes/login.tsx. Running the check
// here instead means every protected page load re-checks it, not just the
// moment right after signing in.
//
// Client-side only — this app server-renders, and Supabase's browser client
// only knows the session after hydration, so a protected page will briefly
// render a loading state (never stale mock content) before either showing
// real content or redirecting. A cookie-based SSR session check would remove
// that flash but is out of scope here.
//
// Renders `children` once a signed-in, consented user is confirmed; shows a
// loading placeholder while auth or consent is resolving; redirects to
// /login once auth finishes with no user, and to /consent
// once consent finishes with `canEnableMic` false or `ageAttested` false
// (SCRUM-24 follow-up: audio-sharing consent alone was never
// adult-eligibility evidence, so a caller missing either gate is sent back
// to the consent page rather than only discovering it later at the LiveKit
// token mint). The consent check itself is skipped on the /consent
// page — that page manages its own consent state, so re-checking
// here would double-fetch and create a redirect loop while consent is
// still missing.
//
// Consent status comes from a shared React Query cache (see
// use-consent-status.ts), so although every route mounts its own
// ProtectedRoute, only the first protected page after sign-in waits on the
// consent fetch -- later navigations render straight from cache. If that
// fetch fails with nothing cached, this shows a retry prompt rather than
// redirecting: a network error says nothing about the caller's consent, and
// sending an already-consented student to /consent for it would be wrong.
//
// Pass `requireConsent={false}` for a page that must stay reachable
// regardless of the caller's consent state (e.g. "Privacy & your data",
// which a student needs to reach to withdraw consent or request deletion
// whether or not they're currently consented) — this skips the consent
// fetch/redirect/loading-gate entirely, the same way the consent page's own
// exemption does, but as an explicit, self-documenting opt-out.
export function ProtectedRoute({
  children,
  requireConsent = true,
}: {
  children: React.ReactNode;
  requireConsent?: boolean;
}) {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isConsentPage = pathname === "/consent";
  const skipConsentCheck = !requireConsent || isConsentPage;
  const {
    canEnableMic,
    ageAttested,
    loading: consentLoading,
    error: consentError,
    refresh: refreshConsent,
  } = useConsentStatus(skipConsentCheck ? null : session);
  const consentSatisfied = canEnableMic && ageAttested;
  const consentCheckFailed = !consentLoading && !consentSatisfied && !!consentError;

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
      return;
    }
    if (
      !loading &&
      user &&
      !skipConsentCheck &&
      !consentLoading &&
      !consentSatisfied &&
      !consentCheckFailed
    ) {
      navigate({ to: "/consent" });
    }
  }, [
    loading,
    user,
    skipConsentCheck,
    consentLoading,
    consentSatisfied,
    consentCheckFailed,
    navigate,
  ]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  if (!skipConsentCheck && consentCheckFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn't check your consent status. Check your connection and try again.
        </p>
        <PmButton variant="outline" onClick={() => void refreshConsent()}>
          Try again
        </PmButton>
      </div>
    );
  }

  if (!skipConsentCheck && (consentLoading || !consentSatisfied)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your consent status…</p>
      </div>
    );
  }

  return <>{children}</>;
}
