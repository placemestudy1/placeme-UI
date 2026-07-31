import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, ShieldCheck } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { Banner, PmBadge, PmButton, PmCard, StatusDot } from "@/components/pm/kit";

export const Route = createFileRoute("/app/consent")({
  head: () => ({
    meta: [
      { title: "Mic access · PlaceMe Mobile" },
      { name: "description", content: "Allow microphone access to speak in live GD rooms." },
      { property: "og:title", content: "Mic access · PlaceMe Mobile" },
      { property: "og:description", content: "Audio-only, and you control the recording." },
    ],
  }),
  component: NativeConsent,
});

function NativeConsent() {
  const levels = [24, 52, 80, 96, 62, 34, 18];
  return (
    <NativeStackScreen
      title="Microphone"
      backTo="/app"
      backLabel="Home"
      footer={
        <>
          <PmButton asChild block size="lg">
            <Link to="/app/lobby">Allow microphone</Link>
          </PmButton>
          <PmButton asChild variant="ghost" block className="mt-2">
            <Link to="/app">Not now</Link>
          </PmButton>
        </>
      }
    >
      <div className="space-y-5 px-5 py-6">
        <div className="grid place-items-center">
          <span className="pulse-ring grid size-24 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground">
            <Mic className="size-10" />
          </span>
        </div>
        <div className="text-center">
          <PmBadge tone="primary">
            <ShieldCheck className="size-3" /> Audio only
          </PmBadge>
          <h2 className="mt-3 text-xl font-bold">"PlaceMe" would like to use your microphone</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your voice is streamed to the room and transcribed to generate your private AI feedback.
          </p>
        </div>
        <PmCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">iPhone Microphone</span>
            <StatusDot status="speaking" label="Detected" />
          </div>
          <div className="mt-3 flex h-14 items-end justify-center gap-1.5">
            {levels.map((l, i) => (
              <span
                key={i}
                className="w-2 animate-pulse rounded-full bg-[image:var(--gradient-primary)]"
                style={{ height: `${l}%`, animationDelay: `${i * 90}ms` }}
              />
            ))}
          </div>
        </PmCard>
        <Banner
          tone="warning"
          title="Use headphones"
          description="Speaker audio causes echo and lowers transcript accuracy."
        />
      </div>
    </NativeStackScreen>
  );
}