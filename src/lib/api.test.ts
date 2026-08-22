import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

import { getConsentStatus, getMyHistory } from "./api";

function fakeSession(token = "test-token"): Session {
  return { access_token: token } as unknown as Session;
}

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("callApi (via getConsentStatus/getMyHistory)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects without making a request when there's no session", async () => {
    const fetchMock = mockFetchOnce(200, {});
    await expect(getConsentStatus(null)).rejects.toThrow("Not signed in");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("attaches the session's bearer token as an Authorization header", async () => {
    const fetchMock = mockFetchOnce(200, { currentVersion: 2, canEnableMic: true });
    await getConsentStatus(fakeSession("abc123"));
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Authorization"]).toBe("Bearer abc123");
  });

  it("resolves with the parsed JSON body on a 200", async () => {
    mockFetchOnce(200, { sessions: [{ id: "s1" }] });
    const result = await getMyHistory(fakeSession());
    expect(result.sessions).toEqual([{ id: "s1" }]);
  });

  it("throws the server's error message on a non-OK response", async () => {
    mockFetchOnce(403, { error: "Consent required" });
    await expect(getMyHistory(fakeSession())).rejects.toThrow("Consent required");
  });

  it("falls back to the HTTP status when the error body has no message", async () => {
    mockFetchOnce(500, {});
    await expect(getMyHistory(fakeSession())).rejects.toThrow("status 500");
  });

  it("falls back to the HTTP status when the error body isn't valid JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("not json")),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(getMyHistory(fakeSession())).rejects.toThrow("status 502");
  });
});
