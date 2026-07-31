import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Lock, Users } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import {
  Field,
  PmBadge,
  PmButton,
  PmCard,
  PmInput,
  PmSelect,
  PmTextarea,
  SectionTitle,
} from "@/components/pm/kit";
import { topics } from "@/lib/demo";

export const Route = createFileRoute("/rooms/new")({
  head: () => ({
    meta: [
      { title: "Create a room · PlaceMe" },
      {
        name: "description",
        content: "Set the topic, seats and timer for your live group discussion room.",
      },
      { property: "og:title", content: "Create a GD room · PlaceMe" },
      {
        property: "og:description",
        content: "Host a voice group discussion and invite peers with a room code.",
      },
    ],
  }),
  component: CreateRoomPage,
});

function CreateRoomPage() {
  return (
    <WebShell title="Create a room" subtitle="Your room code is generated instantly">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PmCard className="p-6 md:p-8">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <Field label="Discussion topic" hint="Pick a suggested topic or write your own">
              <PmSelect defaultValue={topics[0]}>
                {topics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </PmSelect>
            </Field>
            <Field label="Context for participants">
              <PmTextarea defaultValue="Panel-style GD. Moderator opens, each speaker gets 90 seconds, then free debate. Cite data where possible." />
            </Field>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Seats">
                <PmSelect defaultValue="8">
                  <option>4</option>
                  <option>6</option>
                  <option>8</option>
                  <option>10</option>
                </PmSelect>
              </Field>
              <Field label="Duration">
                <PmSelect defaultValue="20 min">
                  <option>15 min</option>
                  <option>20 min</option>
                  <option>25 min</option>
                </PmSelect>
              </Field>
              <Field label="Level">
                <PmSelect defaultValue="Intermediate">
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </PmSelect>
              </Field>
            </div>
            <Field label="Visibility">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-primary/50 bg-primary/10 p-4">
                  <input type="radio" name="vis" defaultChecked className="accent-[var(--primary)]" />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Users className="size-4" /> Public
                    </span>
                    <span className="text-xs text-muted-foreground">Listed for matched peers</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4">
                  <input type="radio" name="vis" className="accent-[var(--primary)]" />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Lock className="size-4" /> Private
                    </span>
                    <span className="text-xs text-muted-foreground">Code only</span>
                  </span>
                </label>
              </div>
            </Field>
            <div className="flex flex-wrap gap-3 pt-2">
              <PmButton asChild size="lg">
                <Link to="/lobby">Create room</Link>
              </PmButton>
              <PmButton variant="ghost" size="lg" type="reset">
                Reset
              </PmButton>
            </div>
          </form>
        </PmCard>

        <aside className="space-y-4">
          <PmCard glass className="p-5">
            <SectionTitle title="Room preview" />
            <PmBadge tone="primary">Starting in 2m</PmBadge>
            <p className="mt-3 text-base font-semibold leading-snug">{topics[0]}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Hosted by you · 20 min · Intermediate
            </p>
            <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Room code</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em]">GD-5312</p>
              <PmButton variant="outline" size="sm" className="mt-3">
                <Copy /> Copy invite
              </PmButton>
            </div>
          </PmCard>
          <PmCard className="p-5 text-sm text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground">Hosting tips</p>
            6–8 speakers keeps everyone above the 10% speak-time threshold the AI needs for reliable
            scoring.
          </PmCard>
        </aside>
      </div>
    </WebShell>
  );
}