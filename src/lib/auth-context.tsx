import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "./supabase-client";
import { identifyUser, initAnalytics, resetAnalytics } from "./analytics";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
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
// - AuthProvider: wraps the app, tracks the Supabase session/user, and
//   exposes signUp/signIn/signOut.
// - useAuth: hook to read the current session/user/loading state and call
//   the sign in/up/out actions.
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Tracks the current Supabase session (via getSession + onAuthStateChange)
// and provides signUp/signIn/signOut to descendants through AuthContext.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAnalytics();
  }, []);

  // Links analytics events to the signed-in user, and clears that link on
  // an actual sign-out transition -- guarded by the ref so this doesn't
  // fire a spurious reset() during the initial loading render, before
  // getSession() has resolved either way.
  const wasSignedInRef = useRef(false);
  useEffect(() => {
    if (session?.user) {
      identifyUser(session.user.id);
      wasSignedInRef.current = true;
    } else if (wasSignedInRef.current) {
      resetAnalytics();
      wasSignedInRef.current = false;
    }
  }, [session]);

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

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signUp: (email, password, options) =>
        options
          ? supabase.auth.signUp({ email, password, options })
          : supabase.auth.signUp({ email, password }),
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Reads the AuthContext value; throws if used outside an AuthProvider.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
