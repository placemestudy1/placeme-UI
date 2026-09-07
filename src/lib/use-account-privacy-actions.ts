import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { withdrawConsent, requestAccountDeletion } from "./api";

function deletionRequestStorageKey(userId: string) {
  return `placeme:deletion-request:${userId}`;
}

// Shared withdraw-consent / request-account-deletion action state for the
// "Privacy & your data" section (SPEC-0012 R5/AC5), consumed by both the web
// (routes/account.tsx) and native (routes/app.account.tsx) pages so this
// business logic isn't duplicated per platform -- only the surrounding JSX
// shell differs between them.
export function useAccountPrivacyActions(
  session: Session | null,
  userId: string | undefined,
  refreshConsent: () => void,
) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawn, setWithdrawn] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [requestedAt, setRequestedAt] = useState<string | null>(null);

  // There's no GET endpoint for an outstanding deletion request yet
  // (docs/engineering/ACCOUNT_DELETION.md) -- persist the confirmation
  // locally per user so it survives a reload instead of silently reverting
  // to "not requested". If this is missing (private window, a different
  // device, storage cleared), the button just re-enables; resubmitting is a
  // safe no-op since createDeletionRequest is idempotent server-side (AC4).
  useEffect(() => {
    if (!userId) return;
    try {
      const stored = localStorage.getItem(deletionRequestStorageKey(userId));
      if (stored) setRequestedAt(stored);
    } catch {
      // Storage unavailable -- falls back to server-side idempotency alone.
    }
  }, [userId]);

  async function handleWithdraw() {
    setWithdrawError(null);
    setWithdrawing(true);
    try {
      await withdrawConsent(session);
      setWithdrawn(true);
      refreshConsent();
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
      if (userId) {
        try {
          localStorage.setItem(deletionRequestStorageKey(userId), result.requestedAt);
        } catch {
          // Storage unavailable -- confirmation still shows for this visit;
          // a reload will just re-show the request button, and resubmitting
          // is a safe no-op server-side.
        }
      }
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  }

  return {
    withdrawing,
    withdrawError,
    withdrawn,
    handleWithdraw,
    deleting,
    deleteError,
    requestedAt,
    handleDeletionRequest,
  };
}
