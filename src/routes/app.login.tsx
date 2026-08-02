/**
 * Native/mobile login screen — lets a student sign in with their college
 * email and password (or Apple) before joining a group discussion.
 *
 * - NativeLogin(): main route component — renders the login form and a link
 *   to sign up.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Mail } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { Field, PmButton, PmInput } from "@/components/pm/kit";

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

// Main login screen: email/password form (plus an Apple sign-in button)
// that currently just navigates on to the mic-consent screen.
function NativeLogin() {
  return (
    <NativeStackScreen
      title="Log in"
      backTo="/app"
      backLabel="Home"
      footer={
        <PmButton asChild block size="lg">
          <Link to="/app/consent">Log in</Link>
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
        <form className="mt-7 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Field label="College email">
            <PmInput type="email" placeholder="you@college.edu" icon={<Mail />} />
          </Field>
          <Field label="Password">
            <PmInput type="password" placeholder="••••••••" icon={<KeyRound />} />
          </Field>
        </form>
        <PmButton variant="outline" block size="lg" className="mt-6">
          Continue with Apple
        </PmButton>
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
