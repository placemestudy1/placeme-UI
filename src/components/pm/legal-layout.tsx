import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "./web-shell";
import { Banner, PmCard } from "./kit";

// Standalone layout for the public /terms and /privacy pages (SPEC-0012 R1).
// Reachable pre-signup, so it deliberately doesn't use WebShell's
// authenticated nav/sidebar chrome -- just the logo, an interim-notice
// banner (the placeholder status is stated up front, not buried), and the
// page content.
export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="aurora min-h-screen bg-background">
      <header className="border-b border-border px-5 py-4">
        <Logo />
      </header>
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="mt-5">
          <Banner
            tone="warning"
            title="Beta interim notice"
            description="Processor and retention details are being finalized (tracked internally as SCRUM-24); this page will be updated when that review completes."
          />
        </div>
        <PmCard className="mt-6 p-6 sm:p-8">
          <div className="prose-legal space-y-5 text-sm leading-relaxed text-muted-foreground">
            {children}
          </div>
        </PmCard>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/">Back to home</Link>
        </p>
      </main>
    </div>
  );
}
