import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useAuth } from "@/lib/auth-context";
import { useConsentStatus } from "@/lib/use-consent-status";

// Auth + consent gate for pages that require a signed-in, consented user.
//
// Exports:
// - ProtectedRoute: renders children once signed in and consented, a
//   loading state while either is resolving, and redirects to the configured
//   authentication or consent route otherwise.
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
// `redirectTo` once auth finishes with no user, and to `consentRedirectTo`
// once consent finishes with `canEnableMic` false or `ageAttested` false
// (SCRUM-24 follow-up: audio-sharing consent alone was never
// adult-eligibility evidence, so a caller missing either gate is sent back
// to the consent page rather than only discovering it later at the LiveKit
// token mint). The consent check itself is skipped on the configured
// consent page — that page manages its own consent state, so re-checking
// here would double-fetch and create a redirect loop while consent is
// still missing.
//
// Pass `requireConsent={false}` for a page that must stay reachable
// regardless of the caller's consent state (e.g. "Privacy & your data",
// which a student needs to reach to withdraw consent or request deletion
// whether or not they're currently consented) — this skips the consent
// fetch/redirect/loading-gate entirely, the same way the consent page's own
// exemption does, but as an explicit, self-documenting opt-out rather than
// pointing `consentRedirectTo` at the page itself.
export function ProtectedRoute({
  children,
  redirectTo = "/login",
  consentRedirectTo = "/consent",
  requireConsent = true,
}: {
  children: React.ReactNode;
  redirectTo?: string;
  consentRedirectTo?: string;
  requireConsent?: boolean;
}) {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isConsentPage = pathname === consentRedirectTo;
  const skipConsentCheck = !requireConsent || isConsentPage;
  const {
    canEnableMic,
    ageAttested,
    loading: consentLoading,
  } = useConsentStatus(skipConsentCheck ? null : session);
  const consentSatisfied = canEnableMic && ageAttested;

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: redirectTo });
      return;
    }
    if (!loading && user && !skipConsentCheck && !consentLoading && !consentSatisfied) {
      navigate({ to: consentRedirectTo });
    }
  }, [
    loading,
    user,
    skipConsentCheck,
    consentLoading,
    consentSatisfied,
    navigate,
    redirectTo,
    consentRedirectTo,
  ]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
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
