/**
 * Renders the login screen where a student signs in with college email/password
 * (or Google OAuth), then routes them to the one-time consent gate or straight
 * home depending on whether they've already agreed to the current consent version.
 *
 * - LoginPage(): main route component; renders the login form and OAuth button.
 * - onSubmit(): handles the email/password sign-in submit, then checks consent
 *   status to decide whether to navigate home or to /consent.
 */
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Mail } from "lucide-react";

import { AuthLayout } from "@/components/pm/auth-layout";
import { Field, PmButton, PmInput } from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";
import { getConsentStatus } from "@/lib/api";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in · PlaceMe" },
      { name: "description", content: "Log in to PlaceMe to join live group discussions." },
      { property: "og:title", content: "Log in · PlaceMe" },
      { property: "og:description", content: "Access your PlaceMe GD practice dashboard." },
    ],
  }),
  component: LoginPage,
});

// Main route component: renders the login form (email/password + Google
// OAuth) and wires up submission handling.
function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Handles the login form submit: signs in with email/password, then
  // checks consent status to route home or to the consent gate.
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data, error: signInError } = await signIn(email, password);
    if (signInError) {
      setSubmitting(false);
      setError(signInError.message);
      return;
    }
    // Skip straight home if this student has already agreed to the current
    // consent version — /consent is a one-time gate, not a step on every
    // login.
    try {
      const status = await getConsentStatus(data.session);
      navigate({ to: status.canEnableMic ? "/" : "/consent" });
    } catch {
      navigate({ to: "/consent" });
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to jump into a live group discussion."
      footer={
        <p className="text-sm text-muted-foreground">
          New to PlaceMe?{" "}
          <Link to="/signup" className="font-semibold text-primary-glow">
            Create an account
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="College email">
          <PmInput
            type="email"
            placeholder="you@college.edu"
            icon={<Mail />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <PmInput
            type="password"
            placeholder="••••••••"
            icon={<KeyRound />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <PmButton
          type="submit"
          block
          size="lg"
          className="mt-2"
          loading={submitting}
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Log in"}
        </PmButton>
        {/*
          Wired for real (supabase.auth.signInWithOAuth) but will error until
          a Google provider is enabled in the Supabase dashboard — that's
          config, not code. See docs/BACKEND_REQUIREMENTS.md#BE-12.
          Button: starts the Google OAuth sign-in flow via Supabase.
        
        <PmButton
          variant="outline"
          block
          size="lg"
          type="button"
          onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}
        >
          Continue with Google
        </PmButton>
        */}
      </form>
    </AuthLayout>
  );
}
