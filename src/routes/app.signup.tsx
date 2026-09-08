/**
 * Renders the PlaceMe mobile app's sign-up screen where a new student enters
 * their name, college email, college, graduating year, and password to
 * create an account, then continues to the consent gate.
 *
 * - NativeSignup(): main route component; renders the mobile sign-up form.
 * - onSubmit(): creates the account via Supabase, then navigates to the
 *   mic-consent screen.
 */
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, KeyRound, Mail, User } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { Field, PmButton, PmInput, PmSelect } from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app/signup")({
  head: () => ({
    meta: [
      { title: "Sign up · PlaceMe Mobile" },
      { name: "description", content: "Create your PlaceMe account on mobile." },
      { property: "og:title", content: "Sign up · PlaceMe Mobile" },
      { property: "og:description", content: "Free GD practice for engineering students." },
    ],
  }),
  component: NativeSignup,
});

// Main route component: renders the mobile sign-up form and wires it up to
// real account creation.
function NativeSignup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState("");
  const [graduationYear, setGraduationYear] = useState("2027");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Creates the account via Supabase, then navigates to the mic-consent
  // screen. Full name, college, and graduating year are all real — see
  // signup.tsx's identical logic for the trigger/migration this relies on.
  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signUpError } = await signUp(email, password, {
      data: { display_name: name, college, graduation_year: graduationYear },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    navigate({ to: "/app/consent" });
  }

  return (
    <NativeStackScreen
      title="Create account"
      backTo="/app/login"
      backLabel="Log in"
      footer={
        <>
          <PmButton block size="lg" loading={submitting} disabled={submitting} onClick={onSubmit}>
            {submitting ? "Creating account…" : "Create account"}
          </PmButton>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            By continuing you agree to our{" "}
            <Link to="/terms" className="font-semibold text-primary-glow">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-semibold text-primary-glow">
              Privacy Policy
            </Link>
            .
          </p>
        </>
      }
    >
      <form className="space-y-4 px-5 py-6" onSubmit={onSubmit}>
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
      </form>
    </NativeStackScreen>
  );
}
