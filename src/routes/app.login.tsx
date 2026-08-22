/**
 * Native/mobile login screen — lets a student sign in with their college
 * email and password before joining a group discussion.
 *
 * - NativeLogin(): main route component — renders the login form and a link
 *   to sign up.
 * - onSubmit(): handles the email/password sign-in submit, then checks
 *   consent status to decide whether to navigate to the mic-consent screen
 *   or straight home.
 */
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Mail } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { Field, PmButton, PmInput } from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";
import { getConsentStatus } from "@/lib/api";

export const Route = createFileRoute("/app/login")({
  head: () => ({
    meta: [
      { title: "Log in · PlaceMe Mobile" },
      { name: "description", content: "Log in to the PlaceMe mobile app." },
      { property: "og:title", content: "Log in · PlaceMe Mobile" },
      { property: "og:description", content: "Sign in to join live GD rooms on your phone." },
    ],
  }),
  component: NativeLogin,
});

// Main login screen: email/password form that signs in via Supabase, then
// routes to the mic-consent gate or straight to the home tab.
function NativeLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Signs in with email/password, then checks consent status to route to
  // the mic-consent gate or straight to the home tab.
  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data, error: signInError } = await signIn(email, password);
    if (signInError) {
      setSubmitting(false);
      setError(signInError.message);
      return;
    }
    try {
      const status = await getConsentStatus(data.session);
      navigate({ to: status.canEnableMic ? "/app" : "/app/consent" });
    } catch {
      navigate({ to: "/app/consent" });
    }
  }

  return (
    <NativeStackScreen
      title="Log in"
      backTo="/app"
      backLabel="Home"
      footer={
        <PmButton block size="lg" loading={submitting} disabled={submitting} onClick={onSubmit}>
          {submitting ? "Signing in…" : "Log in"}
        </PmButton>
      }
    >
      <div className="px-5 pb-6 pt-8">
        <span className="grid size-16 place-items-center rounded-3xl bg-[image:var(--gradient-primary)] font-display text-2xl font-bold text-primary-foreground shadow-glow">
          P
        </span>
        <h2 className="mt-6 text-2xl font-bold">Welcome back</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Log in to join today's group discussion.
        </p>
        <form className="mt-7 space-y-4" onSubmit={onSubmit}>
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
          <Field label="Password">
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
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/app/signup" className="font-semibold text-primary-glow">
            Sign up
          </Link>
        </p>
      </div>
    </NativeStackScreen>
  );
}
