import { describe, expect, it, vi } from "vitest";

import { createBankClient, questionsForAttempt } from "./bank";
import type { Bank } from "./mcq-types";

const bank = (version: string): Bank => ({
  version,
  questions: [
    {
      id: "q1",
      section: "aptitude",
      topic: "quant",
      difficulty: 1,
      stem: "1+1?",
      options: ["1", "2", "3", "4"],
    },
    {
      id: "q2",
      section: "technical",
      topic: "os",
      difficulty: 2,
      stem: "Kernel?",
      options: ["a", "b", "c", "d"],
    },
  ],
  tests: [],
});

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body) });
}

describe("createBankClient", () => {
  it("follows current.json to the versioned bundle", async () => {
    const fetchImpl = vi.fn((url: string) =>
      url.endsWith("current.json")
        ? jsonResponse({ version: "v1", bundlePath: "bank-v1.json" })
        : jsonResponse(bank("v1")),
    );
    const client = createBankClient({ baseUrl: "https://cdn/mcq-bank", fetchImpl });
    expect((await client.getCurrentBank()).version).toBe("v1");
    expect(fetchImpl.mock.calls.map(([u]) => u)).toEqual([
      "https://cdn/mcq-bank/current.json",
      "https://cdn/mcq-bank/bank-v1.json",
    ]);
  });

  it("downloads each bundle version once", async () => {
    const fetchImpl = vi.fn(() => jsonResponse(bank("v1")));
    const client = createBankClient({ baseUrl: "b", fetchImpl });
    await Promise.all([client.getBankVersion("v1"), client.getBankVersion("v1")]);
    await client.getBankVersion("v1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a bundle after a failed download", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({}, 503))
      .mockImplementation(() => jsonResponse(bank("v1")));
    const client = createBankClient({ baseUrl: "b", fetchImpl });
    await expect(client.getBankVersion("v1")).rejects.toThrow(/status 503/);
    expect((await client.getBankVersion("v1")).version).toBe("v1");
  });
});

describe("questionsForAttempt", () => {
  it("returns questions in the attempt's order", () => {
    expect(questionsForAttempt(bank("v1"), ["q2", "q1"]).map((q) => q.id)).toEqual(["q2", "q1"]);
  });

  it("throws when the bundle lacks one of the attempt's questions", () => {
    expect(() => questionsForAttempt(bank("v1"), ["q9"])).toThrow(/missing from bank v1/);
  });
});
