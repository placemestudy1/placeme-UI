import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Loader2, MicOff, ShieldAlert, Trash2 } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { Banner, PmButton, PmCard, SectionTitle } from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";
import { useConsentStatus } from "@/lib/use-consent-status";
import { withdrawConsent, requestAccountDeletion } from "@/lib/api";

// "Privacy & your data" account-settings section (SPEC-0012 R5/AC5): lets a
// student withdraw mic consent and submit a self-serve account-deletion
// request. Not consent-gated -- a student must be able to reach this page
// (e.g. to re-consent, or to request deletion) regardless of their current
// canEnableMic state, so `consentRedirectTo` is pointed at this same route
// to make ProtectedRoute treat it like the consent page itself and skip the
// redirect-to-/consent check (same mechanism consent.tsx relies on).
export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Privacy & your data · PlaceMe" },
      { name: "description", content: "Withdraw microphone consent or request account deletion." },
    ],
  }),
  component: () => (
    <ProtectedRoute consentRedirectTo="/account">
      <AccountPage />
    </ProtectedRoute>
  ),
});

function AccountPage() {
  const { session } = useAuth();
  const { canEnableMic, loading, refresh } = useConsentStatus(session);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawn, setWithdrawn] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [requestedAt, setRequestedAt] = useState<string | null>(null);

  async function handleWithdraw() {
    setWithdrawError(null);
    setWithdrawing(true);
    try {
      await withdrawConsent(session);
      setWithdrawn(true);
      refresh();
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : String(e));
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleDeletionRequest() {
    setDeleteError(null);
    setDeleting(true);
    try {
      const result = await requestAccountDeletion(session);
      setRequestedAt(result.requestedAt);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <WebShell title="Privacy & your data" subtitle="Manage your consent and account data">
      <div className="mx-auto grid max-w-3xl gap-6">
        <PmCard className="p-6 md:p-8">
          <SectionTitle
            title="Microphone consent"
            subtitle={
              loading
                ? "Checking your consent status…"
                : canEnableMic && !withdrawn
                  ? "Currently granted"
                  : "Currently withdrawn -- you'll be asked to re-consent before your next mic-enabled session"
            }
          />
          <p className="text-sm text-muted-foreground">
            Withdrawing stops future microphone access until you re-consent. It does not delete
            your existing consent record, transcript, or feedback.
          </p>
          {withdrawError && (
            <div className="mt-4">
              <Banner tone="danger" title="Couldn't withdraw consent" description={withdrawError} />
            </div>
          )}
          {(withdrawn || (!loading && !canEnableMic)) && !withdrawError && (
            <div className="mt-4">
              <Banner
                tone="success"
                title="Consent withdrawn"
                description="You can grant it again any time from the consent page before joining a session."
              />
            </div>
          )}
          <div className="mt-5">
            <PmButton
              variant="outline"
              onClick={handleWithdraw}
              disabled={loading || withdrawing || withdrawn || !canEnableMic}
            >
              {withdrawing ? <Loader2 className="animate-spin" /> : <MicOff />}
              {withdrawing ? "Withdrawing…" : "Withdraw consent"}
            </PmButton>
          </div>
        </PmCard>

        <PmCard className="p-6 md:p-8">
          <SectionTitle title="Delete your account" subtitle="Removes your account and its data" />
          <p className="text-sm text-muted-foreground">
            This isn't instant: submitting a request notifies a founder, who manually deletes your
            account, transcripts, and feedback -- typically within 7 days. Rooms you created stay
            visible to other participants who were in them; only your own personal data is removed.
          </p>
          {deleteError && (
            <div className="mt-4">
              <Banner tone="danger" title="Couldn't submit request" description={deleteError} />
            </div>
          )}
          {requestedAt && !deleteError && (
            <div className="mt-4">
              <Banner
                tone="success"
                title="Deletion request submitted"
                description={`Requested on ${new Date(requestedAt).toLocaleDateString()}. A founder will process it manually -- you'll be contacted once it's done.`}
              />
            </div>
          )}
          <div className="mt-5">
            <PmButton
              variant="danger"
              onClick={handleDeletionRequest}
              disabled={deleting || !!requestedAt}
            >
              {deleting ? (
                <Loader2 className="animate-spin" />
              ) : requestedAt ? (
                <Check />
              ) : (
                <Trash2 />
              )}
              {deleting
                ? "Submitting…"
                : requestedAt
                  ? "Deletion requested"
                  : "Request account deletion"}
            </PmButton>
          </div>
        </PmCard>

        <PmCard className="p-6 md:p-8">
          <SectionTitle title="Learn more" />
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="size-4 shrink-0" />
            See our{" "}
            <Link to="/privacy" className="font-semibold text-primary-glow">
              Privacy Policy
            </Link>{" "}
            for the full detail on what we collect and why.
          </p>
        </PmCard>
      </div>
    </WebShell>
  );
}
