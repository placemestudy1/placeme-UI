import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, KeyRound, Mail, User } from "lucide-react";

import { AuthLayout } from "@/components/pm/auth-layout";
import { Field, PmButton, PmInput, PmSelect } from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up · PlaceMe" },
      {
        name: "description",
        content:
          "Create a PlaceMe account and start practicing group discussions with AI feedback.",
      },
      { property: "og:title", content: "Sign up · PlaceMe" },
      { property: "og:description", content: "Free GD practice rooms for engineering students." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    // Full name is real — the profiles table's signup trigger reads
    // raw_user_meta_data.display_name (supabase/migrations/0001_profiles.sql).
    const { error: signUpError } = await signUp(email, password, {
      data: { display_name: name },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    navigate({ to: "/consent" });
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free for students. No card required."
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary-glow">
            Log in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Full name">
          <PmInput
            placeholder="Aarav Menon"
            icon={<User />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
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
        {/*
          MOCK — no `college`/`graduating year` columns on profiles yet, see
          docs/BACKEND_REQUIREMENTS.md#BE-14. Kept in the form, not submitted.
        */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="College">
            <PmInput placeholder="NITK Surathkal" icon={<GraduationCap />} />
          </Field>
          <Field label="Graduating year">
            <PmSelect defaultValue="2027">
              <option>2026</option>
              <option>2027</option>
              <option>2028</option>
              <option>2029</option>
            </PmSelect>
          </Field>
        </div>
        <Field label="Password" hint="8+ characters with a number">
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
          {submitting ? "Creating account…" : "Create account"}
        </PmButton>
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </form>
    </AuthLayout>
  );
}
