import { createFileRoute, Link } from "@tanstack/react-router";
import { Shuffle, Users } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import {
  PmAvatar,
  PmBadge,
  PmButton,
  PmCard,
  PmSelect,
  Field,
  SectionTitle,
  Skel,
  StatusDot,
} from "@/components/pm/kit";
import { participants } from "@/lib/demo";

export const Route = createFileRoute("/match")({
  head: () => ({
    meta: [
      { title: "Random match · PlaceMe" },
      {
        name: "description",
        content: "Get paired with skill-matched peers for an instant live group discussion.",
      },
      { property: "og:title", content: "Random match · PlaceMe" },
      { property: "og:description", content: "Matched into a live GD in under 30 seconds." },
    ],
  }),
  component: MatchPage,
});

function MatchPage() {
  return (
    <WebShell title="Random match" subtitle="Average wait time today: 24 seconds">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PmCard glass className="p-8 text-center md:p-12">
          <div className="mx-auto grid size-28 place-items-center rounded-full bg-primary/15">
            <span className="grid size-20 place-items-center rounded-full bg-[image:var(--gradient-primary)] pulse-ring text-primary-foreground">
              <Shuffle className="size-8" />
            </span>
          </div>
          <h2 className="mt-7 text-2xl font-bold">Finding your group…</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Matching on level, speak-time balance and topics you haven't practiced yet.
          </p>
          <StatusDot status="connecting" label="4 of 6 seats filled" className="mt-5" />

          <div className="mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-4">
            {participants.slice(0, 4).map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-2">
                <PmAvatar initials={p.initials} size="lg" />
                <span className="text-xs text-muted-foreground">{p.name.split(" ")[0]}</span>
              </div>
            ))}
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skel className="size-14 rounded-full" />
                <Skel className="h-3 w-10" />
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <PmButton asChild size="lg">
              <Link to="/lobby">Enter lobby</Link>
            </PmButton>
            <PmButton variant="ghost" size="lg" asChild>
              <Link to="/">Cancel</Link>
            </PmButton>
          </div>
        </PmCard>

        <aside className="space-y-4">
          <PmCard className="p-5">
            <SectionTitle title="Match preferences" />
            <div className="space-y-4">
              <Field label="Level">
                <PmSelect defaultValue="Intermediate">
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </PmSelect>
              </Field>
              <Field label="Group size">
                <PmSelect defaultValue="6 speakers">
                  <option>4 speakers</option>
                  <option>6 speakers</option>
                  <option>8 speakers</option>
                </PmSelect>
              </Field>
              <Field label="Topic pool">
                <PmSelect defaultValue="Tech & careers">
                  <option>Tech &amp; careers</option>
                  <option>Business &amp; economy</option>
                  <option>Society &amp; policy</option>
                </PmSelect>
              </Field>
            </div>
          </PmCard>
          <PmCard className="p-5">
            <PmBadge tone="accent">
              <Users className="size-3" /> 23 online
            </PmBadge>
            <p className="mt-3 text-sm text-muted-foreground">
              Peak hours are 6–9 PM IST. Matches at this hour usually fill in under a minute.
            </p>
          </PmCard>
        </aside>
      </div>
    </WebShell>
  );
}