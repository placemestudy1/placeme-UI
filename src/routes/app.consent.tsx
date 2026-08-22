/**
 * Native/mobile mic-permission screen — asks the student to grant browser
 * microphone access and records account-level consent through the backend
 * before letting them join a live GD room.
 *
 * - NativeConsent(): main route component — renders the mic-permission
 *   prompt, requests real mic access, and records consent.
 * - handleAllow(): requests browser mic permission via getUserMedia, then
 *   records consent through grantConsent().
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Mic, ShieldCheck, Headphones } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { Banner, PmBadge, PmButton, PmCard, StatusDot } from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";
import { useConsentStatus } from "@/lib/use-consent-status";

export const Route = createFileRoute("/app/consent")({
  head: () => ({
    meta: [
      { title: "Mic access · PlaceMe Mobile" },
      { name: "description", content: "Allow microphone access to speak in live GD rooms." },
      { property: "og:title", content: "Mic access · PlaceMe Mobile" },
      { property: "og:description", content: "Audio-only, and you control the recording." },
    ],
  }),
  component: () => (
    <ProtectedRoute redirectTo="/app/login" consentRedirectTo="/app/consent">
      <NativeConsent />
    </ProtectedRoute>
  ),
});

type MicState = "idle" | "requesting" | "granted" | "denied";

// Main mic-permission screen: explains why the mic is needed, requests real
// browser mic access + records account-level consent, and offers allow/not-
// now actions leading home.
function NativeConsent() {
  const { session } = useAuth();
  const { canEnableMic, loading, grantConsent } = useConsentStatus(session);
  const [micState, setMicState] = useState<MicState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingSound, setTestingSound] = useState(false);
  const levels = [24, 52, 80, 96, 62, 34, 18];

  function testSound() {
    if (testingSound) return;
    setTestingSound(true);
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 440;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
    oscillator.onended = () => {
      ctx.close();
      setTestingSound(false);
    };
  }

  // Requests browser mic permission, then records account-level consent.
  async function handleAllow() {
    setError(null);
    setMicState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicState("granted");
      setSubmitting(true);
      await grantConsent();
    } catch (e) {
      if (
        e instanceof DOMException &&
        (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")
      ) {
        setMicState("denied");
      } else {
        setError(e instanceof Error ? e.message : String(e));
        setMicState("idle");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <NativeStackScreen title="Microphone" backTo="/app" backLabel="Home">
        <p className="px-5 py-8 text-sm text-muted-foreground">Checking your consent status…</p>
      </NativeStackScreen>
    );
  }

  return (
    <NativeStackScreen
      title="Microphone"
      backTo="/app"
      backLabel="Home"
      footer={
        canEnableMic ? (
          <PmButton asChild block size="lg">
            <Link to="/app">Continue</Link>
          </PmButton>
        ) : (
          <>
            <PmButton
              block
              size="lg"
              onClick={handleAllow}
              disabled={micState === "requesting" || submitting}
            >
              {micState === "requesting" || submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Mic />
              )}
              {micState === "requesting" || submitting ? "Requesting…" : "Allow microphone"}
            </PmButton>
            <PmButton asChild variant="ghost" block className="mt-2">
              <Link to="/app">Not now</Link>
            </PmButton>
          </>
        )
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
          <h2 className="mt-3 text-xl font-bold">
            {canEnableMic ? "Consent recorded" : '"PlaceMe" would like to use your microphone'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {canEnableMic
              ? "You've already agreed to the current consent terms."
              : "Your voice is streamed to the room and transcribed to generate your private AI feedback."}
          </p>
        </div>
        {!canEnableMic && (
          <PmCard className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">iPhone Microphone</span>
              {micState === "granted" ? (
                <StatusDot status="speaking" label="Detected" />
              ) : micState === "denied" ? (
                <StatusDot status="muted" label="Blocked" />
              ) : (
                <StatusDot status="idle" label="Not checked yet" />
              )}
            </div>
            <div className="mt-3 flex h-14 items-end justify-center gap-1.5">
              {levels.map((l, i) => (
                <span
                  key={i}
                  className={`w-2 rounded-full bg-[image:var(--gradient-primary)] ${micState === "granted" ? "animate-pulse" : "opacity-30"}`}
                  style={{ height: `${l}%`, animationDelay: `${i * 90}ms` }}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Headphones className="size-4" /> System speakers
              </span>
              <PmButton
                variant="outline"
                size="sm"
                type="button"
                onClick={testSound}
                disabled={testingSound}
              >
                {testingSound ? "Playing…" : "Test sound"}
              </PmButton>
            </div>
          </PmCard>
        )}
        {micState === "denied" && (
          <Banner
            tone="danger"
            title="Microphone access was denied"
            description="Open your phone's Settings app, find PlaceMe, and turn Microphone on, then try again."
          />
        )}
        {error && <Banner tone="danger" title="Couldn't record your consent" description={error} />}
        <Banner
          tone="warning"
          title="Use headphones"
          description="Speaker audio causes echo and lowers transcript accuracy."
        />
      </div>
    </NativeStackScreen>
  );
}
