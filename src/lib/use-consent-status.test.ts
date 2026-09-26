import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const { getConsentStatusMock, grantConsentApiMock, attestAdultApiMock } = vi.hoisted(() => ({
  getConsentStatusMock: vi.fn(),
  grantConsentApiMock: vi.fn(),
  attestAdultApiMock: vi.fn(),
}));
vi.mock("./api", () => ({
  getConsentStatus: getConsentStatusMock,
  grantConsent: grantConsentApiMock,
  attestAdult: attestAdultApiMock,
}));

import { useConsentStatus } from "./use-consent-status";

const fakeSession = { access_token: "t", user: { id: "u1" } } as unknown as Session;

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
});
