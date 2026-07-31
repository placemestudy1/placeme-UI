import { createFileRoute, Link } from "@tanstack/react-router";
import { Headphones, Mic, ShieldCheck } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { Banner, PmBadge, PmButton, PmCard, StatusDot } from "@/components/pm/kit";

export const Route = createFileRoute("/consent")({
  head: () => ({
    meta: [
      { title: "Microphone access · PlaceMe" },
      {
        name: "description",
        content: "Grant microphone access so PlaceMe can host your live group discussion.",
      },
      { property: "og:title", content: "Microphone access · PlaceMe" },
      {
        property: "og:description",
        content: "Check your mic and speakers before joining a live GD room.",
      },
    ],
  }),
  component: ConsentPage,
});

function Bars() {
  const levels = [22, 48, 76, 96, 64, 38, 20];
  return (
    <div className="flex h-16 items-end justify-center gap-1.5">
      {levels.map((l, i) => (
        <span
          key={i}
          className="w-2 animate-pulse rounded-full bg-[image:var(--gradient-primary)]"
          style={{ height: `${l}%`, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

function ConsentPage() {
  return (
    <WebShell title="Microphone check" subtitle="Required once before your first live session">
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <PmCard glass className="p-6 md:p-8">
          <PmBadge tone="primary">
            <ShieldCheck className="size-3" /> Audio only · never recorded without consent
          </PmBadge>
          <h2 className="mt-4 text-2xl font-bold">Allow PlaceMe to use your microphone</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            We stream your voice to the room and generate a live transcript used only for your
            personal AI feedback. You can revoke access at any time in settings.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Mic className="size-4 text-primary-glow" /> MacBook Pro Microphone
              </span>
              <StatusDot status="speaking" label="Input detected" />
            </div>
            <Bars />
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Headphones className="size-4" /> Studio Display Speakers
              </span>
              <PmButton variant="outline" size="sm">
                Test sound
              </PmButton>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <PmButton asChild size="lg">
              <Link to="/lobby">Allow & continue</Link>
            </PmButton>
            <PmButton asChild variant="ghost" size="lg">
              <Link to="/">Not now</Link>
            </PmButton>
          </div>
        </PmCard>

        <div className="space-y-4">
          <Banner
            tone="warning"
            title="Use headphones"
            description="Speakers cause echo that lowers transcript accuracy and your fluency score."
          />
          <Banner
            tone="info"
            title="Blocked by the browser?"
            description="Click the lock icon in the address bar, then set Microphone to Allow and reload."
          />
        </div>
      </div>
    </WebShell>
  );
}