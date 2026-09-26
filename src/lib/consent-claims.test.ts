import { describe, expect, it } from "vitest";

import { isConsentRejection, readConsentClaims } from "./consent-claims";

// Builds an unsigned JWT-shaped string (header.payload.signature) with a
// base64url payload -- the client only decodes, never verifies.
function tokenWith(payload: unknown): string {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const base64 = btoa(String.fromCharCode(...json));
  const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `eyJhbGciOiJFUzI1NiJ9.${base64url}.sig`;
}

const IAT = 1_790_000_000;

describe("readConsentClaims", () => {
  it("reads the placeme_consent claim and the token's issue time", () => {
    const token = tokenWith({
      sub: "u1",
      iat: IAT,
      placeme_consent: { can_enable_mic: true, age_attested: false, consent_version: 2 },
    });
    expect(readConsentClaims(token)).toEqual({
      canEnableMic: true,
      ageAttested: false,
      consentVersion: 2,
      issuedAtMs: IAT * 1000,
    });
  });

  // Tokens issued before the hook was enabled, or by a hook that errored
  // (it returns the event unchanged), carry no claim.
  it("returns null for a token without the claim", () => {
    expect(readConsentClaims(tokenWith({ sub: "u1", iat: IAT }))).toBeNull();
  });

  it("returns null with no token", () => {
    expect(readConsentClaims(null)).toBeNull();
    expect(readConsentClaims(undefined)).toBeNull();
    expect(readConsentClaims("")).toBeNull();
  });

  it("returns null for a malformed token instead of throwing", () => {
    expect(readConsentClaims("not-a-jwt")).toBeNull();
    expect(readConsentClaims("a.%%%.c")).toBeNull();
    expect(readConsentClaims(`a.${btoa("not json")}.c`)).toBeNull();
  });

  it("returns null when the claim's fields have the wrong types", () => {
    const token = tokenWith({
      iat: IAT,
      placeme_consent: { can_enable_mic: "true", age_attested: true },
    });
    expect(readConsentClaims(token)).toBeNull();
  });

  it("returns null without an iat, since freshness can't be judged", () => {
    const token = tokenWith({
      placeme_consent: { can_enable_mic: true, age_attested: true, consent_version: 2 },
    });
    expect(readConsentClaims(token)).toBeNull();
  });

  it("decodes base64url payloads that need padding and non-ASCII text", () => {
    const token = tokenWith({
      iat: IAT,
      name: "Ānanya ✓",
      placeme_consent: { can_enable_mic: false, age_attested: true, consent_version: null },
    });
    expect(readConsentClaims(token)).toMatchObject({
      canEnableMic: false,
      ageAttested: true,
      consentVersion: null,
    });
  });
});

describe("isConsentRejection", () => {
  it("matches consentGate's two 403 error codes only", () => {
    expect(isConsentRejection("consent_required")).toBe(true);
    expect(isConsentRejection("age_attestation_required")).toBe(true);
    expect(isConsentRejection("Room has ended")).toBe(false);
    expect(isConsentRejection(null)).toBe(false);
  });
});
