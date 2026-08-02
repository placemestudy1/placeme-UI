import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/lib/auth-context";

// Auth gate for pages that require a signed-in user.
//
// Exports:
// - ProtectedRoute: renders children once signed in, a loading state while
//   auth is resolving, and redirects to /login otherwise.
//
// Mirrors gd-proto/apps/web/src/auth/ProtectedRoute.jsx. Client-side only —
// this app server-renders, and Supabase's browser client only knows the
// session after hydration, so a protected page will briefly render this
// loading state (never stale mock content) before either showing real
// content or redirecting. A cookie-based SSR session check would remove
// that flash but is out of scope here.
//
// Renders `children` once a signed-in user is confirmed; shows a "Checking
// your session…" placeholder while auth is loading or the user is absent,
// and redirects to /login once loading finishes with no user.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
