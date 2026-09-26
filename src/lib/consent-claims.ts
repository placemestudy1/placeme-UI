// Reads the caller's consent state out of their Supabase access token.
//
// Exports:
// - ConsentClaims: the decoded `placeme_consent` claim plus the token's
//   issue time.
// - readConsentClaims: decodes it from an access token, or null when the
//   token has no (well-formed) claim.
// - isConsentRejection: whether an API error message is the server's
//   consent/age gate refusing the caller.
//
// gd-proto's Custom Access Token hook (SPEC-0015, migration 0030) stamps
// `placeme_consent: { can_enable_mic, age_attested, consent_version }` into
// every token Supabase issues, so routing can know the caller's consent
// state without a request. The payload is decoded, not verified: this only
// drives client-side routing and UI. Every sensitive operation (the LiveKit
// token mint) is re-checked server-side by consentGate, which never reads
// this claim. A token issued before the hook was enabled -- or by a hook that
// errored -- has no claim; callers fall back to GET /api/consent/status.

export type ConsentClaims = {
  canEnableMic: boolean;
  ageAttested: boolean;
  consentVersion: number | null;
  // Token `iat`, in ms -- lets callers tell whether a status fetched from the
  // server is newer than this claim.
  issuedAtMs: number;
};

function decodeJwtPayload(token: string): unknown {
  const part = token.split(".")[1];
  if (!part) return null;
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function readConsentClaims(accessToken: string | null | undefined): ConsentClaims | null {
  if (!accessToken) return null;
  let payload: unknown;
  try {
    payload = decodeJwtPayload(accessToken);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const { placeme_consent: claim, iat } = payload as { placeme_consent?: unknown; iat?: unknown };
  if (!claim || typeof claim !== "object" || typeof iat !== "number") return null;
  const {
    can_enable_mic: canEnableMic,
    age_attested: ageAttested,
    consent_version: consentVersion,
  } = claim as Record<string, unknown>;
  if (typeof canEnableMic !== "boolean" || typeof ageAttested !== "boolean") return null;
  return {
    canEnableMic,
    ageAttested,
    consentVersion: typeof consentVersion === "number" ? consentVersion : null,
    issuedAtMs: iat * 1000,
  };
}

// The error bodies consentGate returns with a 403 (gd-proto
// middleware/consentGate.js); api.ts surfaces them as the Error message.
export function isConsentRejection(message: string | null | undefined): boolean {
  return message === "consent_required" || message === "age_attestation_required";
}
