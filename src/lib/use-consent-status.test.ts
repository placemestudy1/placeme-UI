import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const { getConsentStatusMock, grantConsentApiMock } = vi.hoisted(() => ({
  getConsentStatusMock: vi.fn(),
  grantConsentApiMock: vi.fn(),
}));
vi.mock("./api", () => ({
  getConsentStatus: getConsentStatusMock,
  grantConsent: grantConsentApiMock,
}));

import { useConsentStatus } from "./use-consent-status";

const fakeSession = { access_token: "t" } as unknown as Session;

describe("useConsentStatus", () => {
  beforeEach(() => {
    getConsentStatusMock.mockReset();
    grantConsentApiMock.mockReset();
  });

  it("stays loading and never fetches without a signed-in session", () => {
    const { result } = renderHook(() => useConsentStatus(null));
    expect(result.current.loading).toBe(true);
    expect(result.current.canEnableMic).toBe(false);
    expect(getConsentStatusMock).not.toHaveBeenCalled();
  });

  it("fetches consent status for a signed-in user", async () => {
    getConsentStatusMock.mockResolvedValue({ currentVersion: 3, canEnableMic: true });
    const { result } = renderHook(() => useConsentStatus(fakeSession));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canEnableMic).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("surfaces a fetch failure as an error and leaves canEnableMic false", async () => {
    getConsentStatusMock.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useConsentStatus(fakeSession));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canEnableMic).toBe(false);
    expect(result.current.error).toBe("network down");
  });

  it("grantConsent posts the grant, then refreshes status", async () => {
    getConsentStatusMock.mockResolvedValue({ currentVersion: 3, canEnableMic: false });
    grantConsentApiMock.mockResolvedValue({ consentVersion: 3, grantedAt: "2026-08-05" });
    const { result } = renderHook(() => useConsentStatus(fakeSession));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canEnableMic).toBe(false);

    getConsentStatusMock.mockResolvedValue({ currentVersion: 3, canEnableMic: true });
    await act(async () => {
      await result.current.grantConsent();
    });

    expect(grantConsentApiMock).toHaveBeenCalledWith(fakeSession);
    expect(result.current.canEnableMic).toBe(true);
  });

  it("grantConsent rejects without a session, and never calls the API", async () => {
    const { result } = renderHook(() => useConsentStatus(null));
    await expect(result.current.grantConsent()).rejects.toThrow("Not signed in");
    expect(grantConsentApiMock).not.toHaveBeenCalled();
  });
});
