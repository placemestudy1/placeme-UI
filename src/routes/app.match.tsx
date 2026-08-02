/**
 * Renders the PlaceMe mobile app's random-match screen: a searching-state UI
 * with matched participant avatars, match preference selectors, and actions
 * to enter the lobby or cancel the search.
 *
 * - NativeMatch(): main route component; renders the mobile match screen.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shuffle } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { PmAvatar, PmButton, PmCard, PmSelect, Field, Skel, StatusDot } from "@/components/pm/kit";
import { participants } from "@/lib/demo";

export const Route = createFileRoute("/app/match")({
  head: () => ({
    meta: [
      { title: "Random match · PlaceMe Mobile" },
      { name: "description", content: "Get matched into a live group discussion from your phone." },
      { property: "og:title", content: "Random match · PlaceMe Mobile" },
      { property: "og:description", content: "Skill-matched peers in under 30 seconds." },
    ],
  }),
  component: NativeMatch,
});

// Main route component: renders the mobile match screen showing search
// progress, matched participants, and match preference selectors.
function NativeMatch() {
  return (
    <NativeTabScreen title="Match">
      <div className="space-y-5 pb-4">
        <PmCard glass className="p-6 text-center">
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-primary/15">
            <span className="pulse-ring grid size-16 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Shuffle className="size-7" />
            </span>
          </div>
          <p className="mt-5 text-lg font-bold">Finding your group…</p>
          <StatusDot status="connecting" label="4 of 6 seats filled" className="mt-2" />
          <div className="mt-6 grid grid-cols-3 gap-4">
            {participants.slice(0, 4).map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1.5">
                <PmAvatar initials={p.initials} size="md" />
                <span className="text-[10px] text-muted-foreground">{p.name.split(" ")[0]}</span>
              </div>
            ))}
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Skel className="size-11 rounded-full" />
                <Skel className="h-2.5 w-8" />
              </div>
            ))}
          </div>
        </PmCard>

        <PmCard className="space-y-4 p-4">
          <Field label="Level">
            <PmSelect defaultValue="Intermediate">
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </PmSelect>
          </Field>
          <Field label="Topic pool">
            <PmSelect defaultValue="Tech & careers">
              <option>Tech &amp; careers</option>
              <option>Business &amp; economy</option>
              <option>Society &amp; policy</option>
            </PmSelect>
          </Field>
        </PmCard>

        <PmButton asChild block size="lg">
          <Link to="/app/consent">Enter lobby</Link>
        </PmButton>
        <PmButton variant="ghost" block>
          Cancel search
        </PmButton>
      </div>
    </NativeTabScreen>
  );
}
