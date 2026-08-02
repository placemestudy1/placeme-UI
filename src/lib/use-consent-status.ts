import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getConsentStatus, grantConsent as grantConsentApi } from "./api";

// Hook for tracking whether this user can enable their mic.
//
// Exports:
// - useConsentStatus: fetches and exposes consent status (canEnableMic,
//   loading, error), plus refresh/grantConsent actions.
//
// Mirrors gd-proto/apps/web/src/consent/useConsentStatus.js. Any screen about
// to enable a mic should check `canEnableMic` here first — false until the
// student has granted the current consent version.
export function useConsentStatus(session: Session | null) {
  const [canEnableMic, setCanEnableMic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!session) return;
    setLoading(true);
    getConsentStatus(session)
      .then((data) => {
        setCanEnableMic(data.canEnableMic);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function grantConsent() {
    if (!session) throw new Error("Not signed in");
    await grantConsentApi(session);
    refresh();
  }

  return { canEnableMic, loading, error, grantConsent, refresh };
}
