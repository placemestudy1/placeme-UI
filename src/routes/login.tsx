import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Mail } from "lucide-react";

import { AuthLayout } from "@/components/pm/auth-layout";
import { Field, PmButton, PmInput } from "@/components/pm/kit";

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

function LoginPage() {
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
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <Field label="College email">
          <PmInput type="email" placeholder="you@college.edu" icon={<Mail />} defaultValue="" />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <PmInput type="password" placeholder="••••••••" icon={<KeyRound />} />
        </Field>
        <PmButton asChild block size="lg" className="mt-2">
          <Link to="/consent">Log in</Link>
        </PmButton>
        <PmButton variant="outline" block size="lg" type="button">
          Continue with Google
        </PmButton>
      </form>
    </AuthLayout>
  );
}