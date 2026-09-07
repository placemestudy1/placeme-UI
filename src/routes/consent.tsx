/**
 * Renders the microphone consent screen: requests browser mic permission,
 * records account-level consent through the backend, and shows the
 * appropriate state (idle/requesting/granted/denied) before letting the
 * user continue to the dashboard.
 *
 * - Bars(): small helper component that renders an animated audio-level bar
 *   visualization.
 * - ConsentPage(): main route component; shows consent status, drives the
 *   mic-permission flow, and gates navigation based on consent state.
 * - handleAllow(): defined inside ConsentPage; requests browser mic
 *   permission via getUserMedia, then records consent through
 *   grantConsent(), updating local state along the way.
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Headphones, Loader2, Mic, MicOff, ShieldCheck } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { DisclosureList } from "@/components/pm/disclosure-list";
import { Banner, PmBadge, PmButton, PmCard, SectionTitle, StatusDot } from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";
import { useConsentStatus } from "@/lib/use-consent-status";
import { CONSENT_DISCLOSURES } from "@/lib/consent-disclosures";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/consent")({
  head: () => ({
    meta: [
      { title: "Microphone access · PlaceMe" },
      {
        name: "description",
        content: "Grant microphone access so PlaceMe can host your live group discussion.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <ConsentPage />
    </ProtectedRoute>
  ),
});

// Renders an animated bar-graph visualization used as a stand-in mic-input
// level indicator.
function Bars({ active }: { active: boolean }) {
  const levels = [22, 48, 76, 96, 64, 38, 20];
  return (
    <div className="flex h-16 items-end justify-center gap-1.5">
      {levels.map((l, i) => (
        <span
          key={i}
          className={`w-2 rounded-full bg-[image:var(--gradient-primary)] ${active ? "animate-pulse" : "opacity-30"}`}
          style={{ height: `${l}%`, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

type MicState = "idle" | "requesting" | "granted" | "denied";

// Main route component: shows the mic-consent status/loading state, then
// either confirms already-granted consent or walks the user through
// requesting mic permission and recording consent.
function ConsentPage() {
  const { session } = useAuth();
  const { canEnableMic, loading, grantConsent } = useConsentStatus(session);
  const [micState, setMicState] = useState<MicState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingSound, setTestingSound] = useState(false);

  // Plays a short tone through the system speakers so the user can confirm
  // audio output works before joining a live session. Client-side only —
  // no backend involved.
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

  if (loading) {
    return (
      <WebShell title="Microphone check">
        <p className="text-sm text-muted-foreground">Checking your consent status…</p>
      </WebShell>
    );
  }

  // Requests browser mic permission, then records account-level consent via
  // grantConsent(); tracks denied vs. other-error states separately.
  async function handleAllow() {
    setError(null);
    setMicState("requesting");
    try {
      // Real browser mic permission — the recorded consent below is what
      // actually gates the LiveKit token mint server-side; this is what
      // gates the browser itself.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicState("granted");
      setSubmitting(true);
      await grantConsent();
      track({ name: "consent_granted" });
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

  // Consent is a one-time, account-level gate (not tied to any specific
  // room), so both the already-granted and just-granted paths continue to
  // the dashboard, not to a room that doesn't exist yet.
  if (canEnableMic) {
    return (
      <WebShell title="Microphone check">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-success/15 text-success">
            <Check className="size-7" />
          </span>
          <h2 className="mt-4 text-xl font-bold">Consent recorded</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You've already agreed to the current consent terms. You're clear to join a mic-enabled
            room.
          </p>
          <PmButton asChild size="lg" className="mt-6">
            <Link to="/">Continue to dashboard</Link>
          </PmButton>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell title="Microphone check" subtitle="Required once before your first live session">
      <div className="mx-auto max-w-4xl">
        <PmCard className="mb-6 p-6 md:p-8">
          <SectionTitle
            title="What you're agreeing to"
            subtitle="Read this before granting microphone access"
          />
          <DisclosureList items={CONSENT_DISCLOSURES} />
          <p className="mt-5 text-sm text-muted-foreground">
            Full details in our{" "}
            <Link to="/privacy" className="font-semibold text-primary-glow">
              Privacy Policy
            </Link>
            .
          </p>
        </PmCard>
      </div>
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <PmCard glass className="p-6 md:p-8">
          <PmBadge tone="primary">
            <ShieldCheck className="size-3" /> Audio only · never recorded without consent
          </PmBadge>
          <h2 className="mt-4 text-2xl font-bold">Allow PlaceMe to use your microphone</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            We stream your voice to the room and generate a live transcript used only for your
            personal AI feedback. You can withdraw consent at any time from the "Privacy &amp; your
            data" section of your account.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Mic className="size-4 text-primary-glow" /> System microphone
              </span>
              {micState === "granted" ? (
                <StatusDot status="speaking" label="Input detected" />
              ) : micState === "denied" ? (
                <StatusDot status="muted" label="Blocked" />
              ) : (
                <StatusDot status="idle" label="Not checked yet" />
              )}
            </div>
            <Bars active={micState === "granted"} />
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
          </div>

          {micState === "denied" && (
            <div className="mt-6">
              <Banner
                tone="danger"
                title="Microphone access was denied"
                description="Click the lock icon in the address bar, set Microphone to Allow, then try again."
              />
            </div>
          )}
          {error && (
            <div className="mt-6">
              <Banner tone="danger" title="Couldn't record your consent" description={error} />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <PmButton
              size="lg"
              onClick={handleAllow}
              disabled={micState === "requesting" || submitting}
            >
              {micState === "requesting" || submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Mic />
              )}
              {micState === "requesting" || submitting ? "Requesting…" : "Allow & continue"}
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
            description="Speakers cause echo that lowers transcript accuracy."
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
