import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Mic, Sparkles, Users } from "lucide-react";

import { Logo } from "./web-shell";
import { PmBadge, PmCard } from "./kit";

// Two-column layout for auth screens (login/signup/consent): a marketing
// panel on desktop/laptop, and a centered card containing `children` (the
// actual form) with a title/subtitle and optional footer.
//
// Exports:
// - AuthLayout: the auth screen layout described above.
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="aurora min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Marketing panel — desktop & laptop only */}
      <div className="hidden flex-col justify-between border-r border-border p-12 lg:flex">
        <Logo />
        <div className="max-w-md">
          <PmBadge tone="accent">
            <Sparkles className="size-3" /> Trusted by 40+ campus placement cells
          </PmBadge>
          <h2 className="mt-5 font-display text-4xl font-bold leading-tight">
            Practice the GD round <span className="text-gradient">before it counts.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Live voice rooms with real peers, real-time transcripts, and individual AI feedback the
            moment the session ends.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              { icon: Mic, text: "Low-latency voice rooms for up to 10 speakers" },
              { icon: Users, text: "Skill-matched peers from 120 engineering colleges" },
              { icon: Sparkles, text: "Scored feedback on content, clarity and fluency" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary-glow">
                  <Icon className="size-4" />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          "My placement GD felt like session 25." — Ishita R., VIT Vellore
        </p>
      </div>

      <div className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:min-h-0">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <PmCard glass className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
            <div className="mt-7">{children}</div>
          </PmCard>
          <div className="mt-6 text-center">{footer}</div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
