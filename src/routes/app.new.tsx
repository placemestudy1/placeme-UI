import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { Field, PmBadge, PmButton, PmCard, PmSelect, PmTextarea } from "@/components/pm/kit";
import { topics } from "@/lib/demo";

export const Route = createFileRoute("/app/new")({
  head: () => ({
    meta: [
      { title: "New room · PlaceMe Mobile" },
      { name: "description", content: "Create a group discussion room from the PlaceMe mobile app." },
      { property: "og:title", content: "New room · PlaceMe Mobile" },
      { property: "og:description", content: "Pick a topic, set the timer, share the code." },
    ],
  }),
  component: NativeNewRoom,
});

function NativeNewRoom() {
  return (
    <NativeTabScreen title="New room">
      <div className="space-y-5 pb-4">
        <PmCard className="space-y-4 p-4">
          <Field label="Topic">
            <PmSelect defaultValue={topics[0]}>
              {topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </PmSelect>
          </Field>
          <Field label="Context">
            <PmTextarea defaultValue="Panel-style GD. Moderator opens, 90 seconds each, then free debate." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <Field label="Visibility">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
              <button className="rounded-lg bg-card py-2 text-xs font-semibold">Public</button>
              <button className="rounded-lg py-2 text-xs font-semibold text-muted-foreground">
                Private
              </button>
            </div>
          </Field>
        </PmCard>

        <PmCard glass className="p-4 text-center">
          <PmBadge tone="primary">Room code</PmBadge>
          <p className="mt-2 font-mono text-2xl font-bold tracking-[0.2em]">GD-5312</p>
          <PmButton variant="outline" size="sm" className="mt-3">
            <Copy /> Share invite
          </PmButton>
        </PmCard>

        <PmButton asChild block size="lg">
          <Link to="/app/consent">Create room</Link>
        </PmButton>
      </div>
    </NativeTabScreen>
  );
}