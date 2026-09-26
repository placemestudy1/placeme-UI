import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const { getConsentStatusMock, grantConsentApiMock, attestAdultApiMock, refreshSessionMock } =
  vi.hoisted(() => ({
    getConsentStatusMock: vi.fn(),
    grantConsentApiMock: vi.fn(),
    attestAdultApiMock: vi.fn(),
    refreshSessionMock: vi.fn(),
  }));
vi.mock("./api", () => ({
  getConsentStatus: getConsentStatusMock,
  grantConsent: grantConsentApiMock,
  attestAdult: attestAdultApiMock,
}));

vi.mock("./auth-context", () => ({
  useAuth: () => ({ refreshSession: refreshSessionMock }),
}));

import { SESSION_REFRESH_TIMEOUT_MS, useConsentStatus } from "./use-consent-status";

// No placeme_consent claim: the fallback path (token issued before the
// access-token hook was enabled).
const fakeSession = { access_token: "t", user: { id: "u1" } } as unknown as Session;

// An unsigned JWT-shaped token carrying a placeme_consent claim.
function tokenWithClaims(
  claim: { can_enable_mic: boolean; age_attested: boolean } | null,
  iatSeconds = Math.floor(Date.now() / 1000),
) {
  const payload: Record<string, unknown> = { sub: "u1", iat: iatSeconds };
  if (claim) payload["placeme_consent"] = { ...claim, consent_version: 2 };
  const b64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `h.${b64}.s`;
}
function sessionWithClaims(
  claim: { can_enable_mic: boolean; age_attested: boolean } | null,
  iatSeconds?: number,
): Session {
  return {
    access_token: tokenWithClaims(claim, iatSeconds),
    user: { id: "u1" },
  } as unknown as Session;
}

// A fresh cache per test, with retries off so failures surface immediately.
let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useConsentStatus", () => {
  beforeEach(() => {
    getConsentStatusMock.mockReset();
    grantConsentApiMock.mockReset();
    attestAdultApiMock.mockReset();
    refreshSessionMock.mockReset();
    // Default: the token can't be refreshed, so refresh() falls back to a
    // fresh status fetch -- the pre-SPEC-0015 behavior these tests pin.
    refreshSessionMock.mockResolvedValue(null);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("stays loading and never fetches without a signed-in session", () => {
    const { result } = renderHook(() => useConsentStatus(null), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.canEnableMic).toBe(false);
    expect(result.current.ageAttested).toBe(false);
    expect(getConsentStatusMock).not.toHaveBeenCalled();
  });

  it("fetches consent status for a signed-in user", async () => {
    getConsentStatusMock.mockResolvedValue({
      currentVersion: 3,
      canEnableMic: true,
      ageAttested: true,
    });
    const { result } = renderHook(() => useConsentStatus(fakeSession), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canEnableMic).toBe(true);
    expect(result.current.ageAttested).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("surfaces a fetch failure as an error and leaves canEnableMic false", async () => {
    getConsentStatusMock.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useConsentStatus(fakeSession), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canEnableMic).toBe(false);
    expect(result.current.error).toBe("network down");
  });

  it("grantConsent posts the grant, then refreshes status", async () => {
    getConsentStatusMock.mockResolvedValue({
      currentVersion: 3,
      canEnableMic: false,
      ageAttested: false,
    });
    grantConsentApiMock.mockResolvedValue({ consentVersion: 3, grantedAt: "2026-08-05" });
    const { result } = renderHook(() => useConsentStatus(fakeSession), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canEnableMic).toBe(false);

    getConsentStatusMock.mockResolvedValue({
      currentVersion: 3,
      canEnableMic: true,
      ageAttested: false,
    });
    await act(async () => {
      await result.current.grantConsent();
    });

    expect(grantConsentApiMock).toHaveBeenCalledWith(fakeSession);
    await waitFor(() => expect(result.current.canEnableMic).toBe(true));
  });

  it("grantConsent rejects without a session, and never calls the API", async () => {
    const { result } = renderHook(() => useConsentStatus(null), { wrapper });
    await expect(result.current.grantConsent()).rejects.toThrow("Not signed in");
    expect(grantConsentApiMock).not.toHaveBeenCalled();
  });

  // SCRUM-24 follow-up: the separate minimal adult (18+) confirmation,
  // independent of mic consent.
  it("confirmAdult posts the attestation, then refreshes status", async () => {
    getConsentStatusMock.mockResolvedValue({
      currentVersion: 3,
      canEnableMic: true,
      ageAttested: false,
    });
    attestAdultApiMock.mockResolvedValue({
      ageAttested: true,
      ageAttestedAt: "2026-09-07T00:00:00.000Z",
    });
    const { result } = renderHook(() => useConsentStatus(fakeSession), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ageAttested).toBe(false);

    getConsentStatusMock.mockResolvedValue({
      currentVersion: 3,
      canEnableMic: true,
      ageAttested: true,
    });
    await act(async () => {
      await result.current.confirmAdult();
    });

    expect(attestAdultApiMock).toHaveBeenCalledWith(fakeSession);
    await waitFor(() => expect(result.current.ageAttested).toBe(true));
  });

  it("confirmAdult rejects without a session, and never calls the API", async () => {
    const { result } = renderHook(() => useConsentStatus(null), { wrapper });
    await expect(result.current.confirmAdult()).rejects.toThrow("Not signed in");
    expect(attestAdultApiMock).not.toHaveBeenCalled();
  });

  // Regression: every route mounts its own ProtectedRoute, so a page
  // navigation unmounts one consumer and mounts another. With per-component
  // state that re-fetched (and re-showed the loading gate) on every page.
  it("serves a remounted consumer from cache without refetching or loading", async () => {
    getConsentStatusMock.mockResolvedValue({
      currentVersion: 3,
      canEnableMic: true,
      ageAttested: true,
    });
    const first = renderHook(() => useConsentStatus(fakeSession), { wrapper });
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const second = renderHook(() => useConsentStatus(fakeSession), { wrapper });
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.canEnableMic).toBe(true);
    expect(second.result.current.ageAttested).toBe(true);
    expect(getConsentStatusMock).toHaveBeenCalledTimes(1);
  });

  it("shares one request between consumers mounted together", async () => {
    getConsentStatusMock.mockResolvedValue({
      currentVersion: 3,
      canEnableMic: true,
      ageAttested: true,
    });
    const a = renderHook(() => useConsentStatus(fakeSession), { wrapper });
    const b = renderHook(() => useConsentStatus(fakeSession), { wrapper });
    await waitFor(() => expect(a.result.current.loading).toBe(false));
    await waitFor(() => expect(b.result.current.loading).toBe(false));
    expect(getConsentStatusMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't refetch when the same user's session object is replaced (token refresh)", async () => {
    getConsentStatusMock.mockResolvedValue({
      currentVersion: 3,
      canEnableMic: true,
      ageAttested: true,
    });
    const { result, rerender } = renderHook(
      ({ session }: { session: Session }) => useConsentStatus(session),
      { wrapper, initialProps: { session: fakeSession } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    const refreshed = { access_token: "t2", user: { id: "u1" } } as unknown as Session;
    rerender({ session: refreshed });
    expect(result.current.loading).toBe(false);
    expect(getConsentStatusMock).toHaveBeenCalledTimes(1);
  });

  it("fetches separately for a different user", async () => {
    getConsentStatusMock.mockResolvedValueOnce({
      currentVersion: 3,
      canEnableMic: true,
      ageAttested: true,
    });
    const first = renderHook(() => useConsentStatus(fakeSession), { wrapper });
    await waitFor(() => expect(first.result.current.canEnableMic).toBe(true));
    first.unmount();

    getConsentStatusMock.mockResolvedValueOnce({
      currentVersion: 3,
      canEnableMic: false,
      ageAttested: false,
    });
    const otherUser = { access_token: "t", user: { id: "u2" } } as unknown as Session;
    const second = renderHook(() => useConsentStatus(otherUser), { wrapper });
    expect(second.result.current.loading).toBe(true);
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.canEnableMic).toBe(false);
    expect(getConsentStatusMock).toHaveBeenCalledTimes(2);
  });

  it("refresh refetches without dropping back into a loading state", async () => {
    getConsentStatusMock.mockResolvedValue({
      currentVersion: 3,
      canEnableMic: true,
      ageAttested: true,
    });
    const { result } = renderHook(() => useConsentStatus(fakeSession), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    getConsentStatusMock.mockResolvedValue({
      currentVersion: 3,
      canEnableMic: false,
      ageAttested: true,
    });
    let refreshing: Promise<unknown> = Promise.resolve();
    act(() => {
      refreshing = result.current.refresh();
    });
    expect(result.current.loading).toBe(false);
    await act(async () => {
      await refreshing;
    });
    await waitFor(() => expect(result.current.canEnableMic).toBe(false));
    expect(getConsentStatusMock).toHaveBeenCalledTimes(2);
  });

  // SPEC-0015: consent state from the access token's placeme_consent claim.
  describe("with a placeme_consent claim in the token", () => {
    it("reads consent from the claim with no request and no loading state", () => {
      const session = sessionWithClaims({ can_enable_mic: true, age_attested: true });
      const { result } = renderHook(() => useConsentStatus(session), { wrapper });
      expect(result.current.loading).toBe(false);
      expect(result.current.canEnableMic).toBe(true);
      expect(result.current.ageAttested).toBe(true);
      expect(result.current.source).toBe("claims");
      expect(getConsentStatusMock).not.toHaveBeenCalled();
    });

    it("reports an unconsented claim as-is, still without fetching", () => {
      const session = sessionWithClaims({ can_enable_mic: false, age_attested: true });
      const { result } = renderHook(() => useConsentStatus(session), { wrapper });
      expect(result.current.canEnableMic).toBe(false);
      expect(result.current.ageAttested).toBe(true);
      expect(getConsentStatusMock).not.toHaveBeenCalled();
    });

    it("updates as soon as the session's token carries a new claim", () => {
      const before = sessionWithClaims({ can_enable_mic: false, age_attested: false });
      const { result, rerender } = renderHook(
        ({ session }: { session: Session }) => useConsentStatus(session),
        { wrapper, initialProps: { session: before } },
      );
      expect(result.current.canEnableMic).toBe(false);

      rerender({ session: sessionWithClaims({ can_enable_mic: true, age_attested: true }) });
      expect(result.current.canEnableMic).toBe(true);
      expect(result.current.ageAttested).toBe(true);
      expect(getConsentStatusMock).not.toHaveBeenCalled();
    });

    it("grantConsent reissues the token so the claim reflects the grant, with no status fetch", async () => {
      const session = sessionWithClaims({ can_enable_mic: false, age_attested: true });
      const reissued = sessionWithClaims({ can_enable_mic: true, age_attested: true });
      grantConsentApiMock.mockResolvedValue({});
      refreshSessionMock.mockResolvedValue(reissued);

      const { result } = renderHook(() => useConsentStatus(session), { wrapper });
      await act(async () => {
        await result.current.grantConsent();
      });

      expect(grantConsentApiMock).toHaveBeenCalledWith(session);
      expect(refreshSessionMock).toHaveBeenCalledTimes(1);
      expect(getConsentStatusMock).not.toHaveBeenCalled();
    });

    it("confirmAdult reissues the token too", async () => {
      const session = sessionWithClaims({ can_enable_mic: true, age_attested: false });
      attestAdultApiMock.mockResolvedValue({});
      refreshSessionMock.mockResolvedValue(
        sessionWithClaims({ can_enable_mic: true, age_attested: true }),
      );
      const { result } = renderHook(() => useConsentStatus(session), { wrapper });
      await act(async () => {
        await result.current.confirmAdult();
      });
      expect(refreshSessionMock).toHaveBeenCalledTimes(1);
      expect(getConsentStatusMock).not.toHaveBeenCalled();
    });

    // Stale claim: the token couldn't be reissued after a change, so its
    // claim predates it. A fresh fetch -- newer than the token -- must win,
    // or the student would be routed on the pre-change state.
    it("when the token can't be reissued, a fresh fetch overrides the stale claim", async () => {
      const issuedAWhileAgo = Math.floor(Date.now() / 1000) - 600;
      const session = sessionWithClaims(
        { can_enable_mic: true, age_attested: true },
        issuedAWhileAgo,
      );
      refreshSessionMock.mockResolvedValue(null);
      getConsentStatusMock.mockResolvedValue({
        currentVersion: 2,
        canEnableMic: false,
        ageAttested: true,
      });

      const { result } = renderHook(() => useConsentStatus(session), { wrapper });
      expect(result.current.canEnableMic).toBe(true);

      await act(async () => {
        await result.current.refresh();
      });
      await waitFor(() => expect(result.current.canEnableMic).toBe(false));
      expect(result.current.source).toBe("server");
      expect(getConsentStatusMock).toHaveBeenCalledTimes(1);
    });

    it("a token issued after that fetch takes over from it again", async () => {
      const old = Math.floor(Date.now() / 1000) - 600;
      const session = sessionWithClaims({ can_enable_mic: true, age_attested: true }, old);
      refreshSessionMock.mockResolvedValue(null);
      getConsentStatusMock.mockResolvedValue({
        currentVersion: 2,
        canEnableMic: false,
        ageAttested: true,
      });
      const { result, rerender } = renderHook(({ s }: { s: Session }) => useConsentStatus(s), {
        wrapper,
        initialProps: { s: session },
      });
      await act(async () => {
        await result.current.refresh();
      });
      await waitFor(() => expect(result.current.source).toBe("server"));

      // Supabase's next automatic refresh: a newer token with a newer claim.
      const later = Math.floor(Date.now() / 1000) + 60;
      rerender({ s: sessionWithClaims({ can_enable_mic: true, age_attested: true }, later) });
      expect(result.current.source).toBe("claims");
      expect(result.current.canEnableMic).toBe(true);
    });

    it("a successful reissue drops any fetched status so the new claim is the source", async () => {
      const old = Math.floor(Date.now() / 1000) - 600;
      const session = sessionWithClaims({ can_enable_mic: false, age_attested: true }, old);
      getConsentStatusMock.mockResolvedValue({
        currentVersion: 2,
        canEnableMic: false,
        ageAttested: true,
      });
      refreshSessionMock.mockResolvedValueOnce(null);
      const { result, rerender } = renderHook(({ s }: { s: Session }) => useConsentStatus(s), {
        wrapper,
        initialProps: { s: session },
      });
      await act(async () => {
        await result.current.refresh();
      });
      await waitFor(() => expect(result.current.source).toBe("server"));

      // Issued in the same second as the fetch above: still the fresher one.
      const reissued = sessionWithClaims({ can_enable_mic: true, age_attested: true });
      refreshSessionMock.mockResolvedValueOnce(reissued);
      await act(async () => {
        await result.current.refresh();
      });
      // AuthProvider hands every consumer the reissued session.
      rerender({ s: reissued });
      expect(result.current.source).toBe("claims");
      expect(result.current.canEnableMic).toBe(true);
      expect(queryClient.getQueryData(["consent-status", "u1"])).toBeUndefined();
    });
  });

  // supabase-js keeps retrying a refresh that fails on the network for up to
  // ~30s; the grant flow mustn't hang on it.
  it("falls back to a status fetch when reissuing the token hangs", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const old = Math.floor(Date.now() / 1000) - 600;
      const session = sessionWithClaims({ can_enable_mic: false, age_attested: true }, old);
      refreshSessionMock.mockReturnValue(new Promise(() => {}));
      getConsentStatusMock.mockResolvedValue({
        currentVersion: 2,
        canEnableMic: true,
        ageAttested: true,
      });
      const { result } = renderHook(() => useConsentStatus(session), { wrapper });

      let done = false;
      act(() => {
        void result.current.refresh().then(() => {
          done = true;
        });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SESSION_REFRESH_TIMEOUT_MS - 100);
      });
      expect(done).toBe(false);
      expect(getConsentStatusMock).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      await waitFor(() => expect(done).toBe(true));
      await waitFor(() => expect(result.current.canEnableMic).toBe(true));
      expect(getConsentStatusMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  // Missing claim: tokens issued before the hook was enabled.
  describe("without a placeme_consent claim", () => {
    it("falls back to fetching the status", async () => {
      getConsentStatusMock.mockResolvedValue({
        currentVersion: 2,
        canEnableMic: true,
        ageAttested: true,
      });
      const session = sessionWithClaims(null);
      const { result } = renderHook(() => useConsentStatus(session), { wrapper });
      expect(result.current.loading).toBe(true);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.canEnableMic).toBe(true);
      expect(result.current.source).toBe("server");
      expect(getConsentStatusMock).toHaveBeenCalledTimes(1);
    });

    it("treats a malformed claim as missing and falls back", async () => {
      getConsentStatusMock.mockResolvedValue({
        currentVersion: 2,
        canEnableMic: false,
        ageAttested: false,
      });
      const b64 = btoa(JSON.stringify({ iat: 1, placeme_consent: { can_enable_mic: "yes" } }));
      const session = { access_token: `h.${b64}.s`, user: { id: "u1" } } as unknown as Session;
      const { result } = renderHook(() => useConsentStatus(session), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.source).toBe("server");
      expect(getConsentStatusMock).toHaveBeenCalledTimes(1);
    });

    it("switches to the claim once a reissued token carries one (hook just enabled)", async () => {
      getConsentStatusMock.mockResolvedValue({
        currentVersion: 2,
        canEnableMic: false,
        ageAttested: true,
      });
      const { result, rerender } = renderHook(({ s }: { s: Session }) => useConsentStatus(s), {
        wrapper,
        initialProps: { s: sessionWithClaims(null) },
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.source).toBe("server");

      rerender({ s: sessionWithClaims({ can_enable_mic: true, age_attested: true }) });
      expect(result.current.source).toBe("claims");
      expect(result.current.canEnableMic).toBe(true);
    });
  });
});
