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
  const [college, setCollege] = useState("");
  const [graduationYear, setGraduationYear] = useState("2027");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    // Full name, college, and graduating year are all real — the profiles
    // table's signup trigger reads raw_user_meta_data for each
    // (supabase/migrations/0001_profiles.sql, extended by
    // 0018_profiles_college_graduation_year.sql for the latter two).
    const { error: signUpError } = await signUp(email, password, {
      data: { display_name: name, college, graduation_year: graduationYear },
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="College">
            <PmInput
              placeholder="NITK Surathkal"
              icon={<GraduationCap />}
              value={college}
              onChange={(e) => setCollege(e.target.value)}
            />
          </Field>
          <Field label="Graduating year">
            <PmSelect value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)}>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
              <option value="2029">2029</option>
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
