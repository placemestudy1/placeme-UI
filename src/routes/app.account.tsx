import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Loader2, MicOff, Trash2 } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { Banner, PmButton, PmCard } from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";
import { useConsentStatus } from "@/lib/use-consent-status";
import { useAccountPrivacyActions } from "@/lib/use-account-privacy-actions";

// Native mirror of routes/account.tsx -- see that file for the full
// rationale (SPEC-0012 R5/AC5). `requireConsent={false}` keeps this page
// reachable regardless of current mic-consent state.
export const Route = createFileRoute("/app/account")({
  head: () => ({
    meta: [
      { title: "Privacy & your data · PlaceMe Mobile" },
      { name: "description", content: "Withdraw microphone consent or request account deletion." },
    ],
  }),
  component: () => (
    <ProtectedRoute redirectTo="/app/login" requireConsent={false}>
      <NativeAccount />
    </ProtectedRoute>
  ),
});

function NativeAccount() {
  const { user, session } = useAuth();
  const { canEnableMic, loading, refresh } = useConsentStatus(session);
  const {
    withdrawing,
    withdrawError,
    withdrawn,
    handleWithdraw,
    deleting,
    deleteError,
    requestedAt,
    handleDeletionRequest,
  } = useAccountPrivacyActions(session, user?.id, refresh);

  return (
    <NativeStackScreen title="Privacy & data" backTo="/app" backLabel="Home">
      <div className="space-y-5 px-5 py-6">
        <PmCard className="p-4">
          <p className="text-sm font-semibold">Microphone consent</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading
              ? "Checking your consent status…"
              : canEnableMic && !withdrawn
                ? "Currently granted"
                : "Not currently granted -- you'll be asked to consent before your next mic-enabled session"}
          </p>
          {withdrawError && (
            <div className="mt-3">
              <Banner tone="danger" title="Couldn't withdraw" description={withdrawError} />
            </div>
          )}
          {withdrawn && !withdrawError && (
            <div className="mt-3">
              <Banner
                tone="success"
                title="Consent withdrawn"
                description="Grant it again any time from the consent screen."
              />
            </div>
          )}
          <div className="mt-4">
            <PmButton
              variant="outline"
              size="sm"
              onClick={handleWithdraw}
              disabled={loading || withdrawing || withdrawn || !canEnableMic}
            >
              {withdrawing ? <Loader2 className="animate-spin" /> : <MicOff />}
              {withdrawing ? "Withdrawing…" : "Withdraw consent"}
            </PmButton>
          </div>
        </PmCard>

        <PmCard className="p-4">
          <p className="text-sm font-semibold">Delete your account</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Not instant -- a founder processes deletion requests manually, typically within 7 days.
          </p>
          {deleteError && (
            <div className="mt-3">
              <Banner tone="danger" title="Couldn't submit request" description={deleteError} />
            </div>
          )}
          {requestedAt && !deleteError && (
            <div className="mt-3">
              <Banner
                tone="success"
                title="Request submitted"
                description={`Requested ${new Date(requestedAt).toLocaleDateString()}.`}
              />
            </div>
          )}
          <div className="mt-4">
            <PmButton
              variant="danger"
              size="sm"
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

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/privacy" className="font-semibold text-primary-glow">
            Read our Privacy Policy
          </Link>
        </p>
      </div>
    </NativeStackScreen>
  );
}
