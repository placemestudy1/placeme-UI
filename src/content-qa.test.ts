import { describe, expect, it } from "vitest";

const routeSources = import.meta.glob("./routes/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const misleadingClaims = [
  { claim: "evaluation equivalence to a placement panel", pattern: /real placement panel/i },
  {
    claim: "leadership inferred from talk time",
    pattern: /\b(?:led the discussion|leadership)\b/i,
  },
  { claim: "room-code expiry", pattern: /\b(?:room )?codes? expire(?:s|d)?\b/i },
  { claim: "personalized deterministic suggestions", pattern: /\bpersonalized\b/i },
  {
    claim: "unsupported reliable-scoring threshold",
    pattern: /\b(?:reliable scoring|10% speak-time threshold)\b/i,
  },
];

describe("truthful product copy", () => {
  for (const { claim, pattern } of misleadingClaims) {
    it(`does not make the known ${claim} claim on a supported route`, () => {
      for (const [path, source] of Object.entries(routeSources)) {
        expect(source, path).not.toMatch(pattern);
      }
    });
  }

  it("explains waiting-room code behavior on desktop and mobile routes", () => {
    expect(routeSources["./routes/join.tsx"]).toContain(
      "A room code can be used only while that room is waiting to start.",
    );
    expect(routeSources["./routes/app.join.tsx"]).toContain(
      "A room code can be used only while that room is waiting to start.",
    );
    expect(routeSources["./routes/$.tsx"]).toContain("A code can join only a waiting room.");
    expect(routeSources["./routes/app.$.tsx"]).toContain(
      "A room code can join only a room that is still waiting to start.",
    );
  });

  it("labels evaluation and suggestions according to their actual source", () => {
    expect(routeSources["./routes/ended.$roomId.tsx"]).toContain(
      "Based on PlaceMe's current AI evaluation rubric",
    );
    expect(routeSources["./routes/ended.$roomId.tsx"]).toContain("Targets your lowest sub-score");
    expect(routeSources["./routes/app.ended.tsx"]).toContain(
      "Based on PlaceMe's current AI evaluation rubric",
    );
    expect(routeSources["./routes/app.ended.tsx"]).toContain("General practice topic");
  });
});
