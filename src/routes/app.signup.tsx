import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, KeyRound, Mail, User } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { Field, PmButton, PmInput, PmSelect } from "@/components/pm/kit";

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

function NativeSignup() {
  return (
    <NativeStackScreen
      title="Create account"
      backTo="/app/login"
      backLabel="Log in"
      footer={
        <>
          <PmButton asChild block size="lg">
            <Link to="/app/consent">Create account</Link>
          </PmButton>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </>
      }
    >
      <div className="space-y-4 px-5 py-6">
        <Field label="Full name">
          <PmInput placeholder="Aarav Menon" icon={<User />} />
        </Field>
        <Field label="College email">
          <PmInput type="email" placeholder="you@college.edu" icon={<Mail />} />
        </Field>
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
        <Field label="Password" hint="8+ characters with a number">
          <PmInput type="password" placeholder="••••••••" icon={<KeyRound />} />
        </Field>
      </div>
    </NativeStackScreen>
  );
}