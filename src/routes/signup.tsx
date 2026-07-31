import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, KeyRound, Mail, User } from "lucide-react";

import { AuthLayout } from "@/components/pm/auth-layout";
import { Field, PmButton, PmInput, PmSelect } from "@/components/pm/kit";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up · PlaceMe" },
      {
        name: "description",
        content: "Create a PlaceMe account and start practicing group discussions with AI feedback.",
      },
      { property: "og:title", content: "Sign up · PlaceMe" },
      { property: "og:description", content: "Free GD practice rooms for engineering students." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
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
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Full name">
          <PmInput placeholder="Aarav Menon" icon={<User />} />
        </Field>
        <Field label="College email">
          <PmInput type="email" placeholder="you@college.edu" icon={<Mail />} />
        </Field>
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
          <PmInput type="password" placeholder="••••••••" icon={<KeyRound />} />
        </Field>
        <PmButton asChild block size="lg" className="mt-2">
          <Link to="/consent">Create account</Link>
        </PmButton>
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </form>
    </AuthLayout>
  );
}