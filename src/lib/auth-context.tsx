import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "./supabase-client";
import { identifyUser, initAnalytics, resetAnalytics } from "./analytics";
import { consentStatusQueryKeyRoot } from "./consent-status-query";
import { readConsentClaims, type ConsentClaims } from "./consent-claims";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  // The caller's consent state from their access token's placeme_consent
  // claim (SPEC-0015), or null when the token has none -- see
  // consent-claims.ts. Client-side routing/UI only.
  consentClaims: ConsentClaims | null;
  // Reissues the access token (so its claims reflect a consent change right
  // away) and updates `session`; resolves to the new session, or null if
  // the refresh failed.
  refreshSession: () => Promise<Session | null>;
  signUp: (
    email: string,
    password: string,
    options?: { data?: Record<string, unknown> },
  ) => ReturnType<typeof supabase.auth.signUp>;
  signIn: (email: string, password: string) => ReturnType<typeof supabase.auth.signInWithPassword>;
  signOut: () => ReturnType<typeof supabase.auth.signOut>;
};

// Supabase-backed auth context for the app.
//
// Exports:
// - AuthProvider: wraps the app, tracks the Supabase session/user and the
//   consent claims in its token, and exposes signUp/signIn/signOut and
//   refreshSession.
// - useAuth: hook to read the current session/user/loading/consentClaims
//   state and call those actions.
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Tracks the current Supabase session (via getSession + onAuthStateChange)
// and provides signUp/signIn/signOut to descendants through AuthContext.
// Must render inside a QueryClientProvider.
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAnalytics();
  }, []);

  // Links analytics events to the signed-in user, and clears that link (and
  // the cached consent status) on an actual sign-out transition -- guarded
  // by the ref so this doesn't fire a spurious reset() during the initial
  // loading render, before getSession() has resolved either way.
  const wasSignedInRef = useRef(false);
  useEffect(() => {
    if (session?.user) {
      identifyUser(session.user.id);
      wasSignedInRef.current = true;
    } else if (wasSignedInRef.current) {
      resetAnalytics();
      queryClient.removeQueries({ queryKey: consentStatusQueryKeyRoot });
      wasSignedInRef.current = false;
    }
  }, [session, queryClient]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const accessToken = session?.access_token;
  const consentClaims = useMemo(() => readConsentClaims(accessToken), [accessToken]);

  // Stable identity, so effects that depend on it don't re-run on every
  // session change it causes. onAuthStateChange also fires TOKEN_REFRESHED
  // before supabase's refreshSession() resolves; setting the session here
  // too keeps this independent of that order.
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) return null;
      setSession(data.session);
      return data.session;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      consentClaims,
      refreshSession,
      signUp: (email, password, options) =>
        options
          ? supabase.auth.signUp({ email, password, options })
          : supabase.auth.signUp({ email, password }),
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, loading, consentClaims, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Reads the AuthContext value; throws if used outside an AuthProvider.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
