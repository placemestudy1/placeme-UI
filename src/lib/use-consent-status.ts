import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  attestAdult as attestAdultApi,
  getConsentStatus,
  grantConsent as grantConsentApi,
} from "./api";

// Hook for tracking whether this user can enable their mic.
//
// Exports:
// - useConsentStatus: fetches and exposes consent status (canEnableMic,
//   ageAttested, loading, error), plus refresh/grantConsent/confirmAdult
//   actions.
//
// Mirrors gd-proto/apps/web/src/consent/useConsentStatus.js. Any screen about
// to enable a mic should check `canEnableMic` here first — false until the
// student has granted the current consent version. `ageAttested` is a
// separate, independent gate (SCRUM-24 follow-up): audio-sharing consent
// alone was never adult-eligibility evidence.
export function useConsentStatus(session: Session | null) {
  const [canEnableMic, setCanEnableMic] = useState(false);
  const [ageAttested, setAgeAttested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!session) return;
    setLoading(true);
    getConsentStatus(session)
      .then((data) => {
        setCanEnableMic(data.canEnableMic);
        setAgeAttested(data.ageAttested);
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

  async function confirmAdult() {
    if (!session) throw new Error("Not signed in");
    await attestAdultApi(session);
    refresh();
  }

  return { canEnableMic, ageAttested, loading, error, grantConsent, confirmAdult, refresh };
}
