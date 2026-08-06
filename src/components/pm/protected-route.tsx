import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

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
// /login once auth finishes with no user, and to /consent once consent
// finishes with `canEnableMic` false. The consent check itself is skipped on
// /consent — that page is the redirect target and manages its own consent
// state, so re-checking here would just double-fetch and, if consent is
// still missing, create a redirect loop back to itself.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isConsentPage = pathname === "/consent";
  const { canEnableMic, loading: consentLoading } = useConsentStatus(
    isConsentPage ? null : session,
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
      return;
    }
    if (!loading && user && !isConsentPage && !consentLoading && !canEnableMic) {
      navigate({ to: "/consent" });
    }
  }, [loading, user, isConsentPage, consentLoading, canEnableMic, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  if (!isConsentPage && (consentLoading || !canEnableMic)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your consent status…</p>
      </div>
    );
  }

  return <>{children}</>;
}
