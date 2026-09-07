import { describe, expect, it } from "vitest";

import { CONSENT_DISCLOSURES } from "./consent-disclosures";

// Regression guard: SPEC-0012 R2/AC2 requires every one of these disclosures
// before mic permission is requested. If a future edit accidentally drops
// one, this fails loudly instead of silently shrinking the list.
describe("CONSENT_DISCLOSURES", () => {
  it("covers mic capture, no raw audio storage, retention, DR-02 peer visibility, Gemini processing, and the interim notice", () => {
    const titles = CONSENT_DISCLOSURES.map((d) => d.title.toLowerCase());
    expect(titles.some((t) => t.includes("microphone"))).toBe(true);
    expect(titles.some((t) => t.includes("raw audio"))).toBe(true);
    expect(titles.some((t) => t.includes("retention"))).toBe(true);
    expect(titles.some((t) => t.includes("peer visibility"))).toBe(true);
    expect(titles.some((t) => t.includes("gemini"))).toBe(true);
    expect(titles.some((t) => t.includes("interim"))).toBe(true);
  });

  it("states DR-02's own-excerpts-only peer-visibility position", () => {
    const peer = CONSENT_DISCLOSURES.find((d) => d.title.toLowerCase().includes("peer visibility"));
    expect(peer?.body).toMatch(/own excerpts only during beta|own session transcript/i);
  });

  it("labels the interim notice as pending legal review, not final", () => {
    const interim = CONSENT_DISCLOSURES.find((d) => d.title.toLowerCase().includes("interim"));
    expect(interim?.body).toMatch(/interim/i);
    expect(interim?.body).toMatch(/pending/i);
  });
});
