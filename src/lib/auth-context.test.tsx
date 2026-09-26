import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

const { authMock } = vi.hoisted(() => ({
  authMock: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
  },
}));
vi.mock("./supabase-client", () => ({ supabase: { auth: authMock } }));

import { AuthProvider, useAuth } from "./auth-context";

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function fakeSession(userId: string): Session {
  return { access_token: "t", user: { id: userId } } as unknown as Session;
}

describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
    authMock.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("starts loading, then resolves the current session and derived user", async () => {
    const session = fakeSession("u1");
    authMock.getSession.mockResolvedValue({ data: { session } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toEqual(session);
    expect(result.current.user).toEqual(session.user);
  });

  it("has no user when there's no session", async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("updates the session when Supabase's auth-state listener fires", async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null } });
    let onChange: (event: string, session: Session | null) => void = () => {};
    authMock.onAuthStateChange.mockImplementation((cb: typeof onChange) => {
      onChange = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newSession = fakeSession("u2");
    act(() => {
      onChange("SIGNED_IN", newSession);
    });

    expect(result.current.session).toEqual(newSession);
    expect(result.current.user).toEqual(newSession.user);
  });

  it("clears cached consent status when the user signs out", async () => {
    const session = fakeSession("u1");
    authMock.getSession.mockResolvedValue({ data: { session } });
    let onChange: (event: string, session: Session | null) => void = () => {};
    authMock.onAuthStateChange.mockImplementation((cb: typeof onChange) => {
      onChange = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    const key = ["consent-status", "u1"];
    queryClient.setQueryData(key, { currentVersion: 3, canEnableMic: true, ageAttested: true });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(session.user));
    expect(queryClient.getQueryData(key)).toBeDefined();

    act(() => {
      onChange("SIGNED_OUT", null);
    });
    await waitFor(() => expect(queryClient.getQueryData(key)).toBeUndefined());
  });

  // SPEC-0015: the global consent state comes from the token's claim.
  it("exposes the access token's placeme_consent claim as consentClaims", async () => {
    const payload = btoa(
      JSON.stringify({
        sub: "u1",
        iat: 1_790_000_000,
        placeme_consent: { can_enable_mic: true, age_attested: false, consent_version: 2 },
      }),
    );
    const session = {
      access_token: `h.${payload}.s`,
      user: { id: "u1" },
    } as unknown as Session;
    authMock.getSession.mockResolvedValue({ data: { session } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.consentClaims).toEqual({
      canEnableMic: true,
      ageAttested: false,
      consentVersion: 2,
      issuedAtMs: 1_790_000_000_000,
    });
  });

  it("has null consentClaims for a token without the claim", async () => {
    authMock.getSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.consentClaims).toBeNull();
  });

  it("refreshSession reissues the token and updates session and consentClaims", async () => {
    authMock.getSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
    const payload = btoa(
      JSON.stringify({
        sub: "u1",
        iat: 1_790_000_000,
        placeme_consent: { can_enable_mic: true, age_attested: true, consent_version: 2 },
      }),
    );
    const reissued = { access_token: `h.${payload}.s`, user: { id: "u1" } } as unknown as Session;
    authMock.refreshSession.mockResolvedValue({ data: { session: reissued }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.consentClaims).toBeNull();

    let returned: Session | null = null;
    await act(async () => {
      returned = await result.current.refreshSession();
    });
    expect(returned).toBe(reissued);
    expect(result.current.session).toBe(reissued);
    expect(result.current.consentClaims?.canEnableMic).toBe(true);
  });

  it("refreshSession resolves to null and keeps the session when the refresh fails", async () => {
    const session = fakeSession("u1");
    authMock.getSession.mockResolvedValue({ data: { session } });
    authMock.refreshSession.mockResolvedValue({
      data: { session: null },
      error: new Error("offline"),
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: Session | null | undefined;
    await act(async () => {
      returned = await result.current.refreshSession();
    });
    expect(returned).toBeNull();
    expect(result.current.session).toBe(session);
  });

  it("keeps refreshSession's identity stable across session changes", async () => {
    authMock.getSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
    authMock.refreshSession.mockResolvedValue({
      data: { session: fakeSession("u1") },
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const first = result.current.refreshSession;
    await act(async () => {
      await result.current.refreshSession();
    });
    expect(result.current.refreshSession).toBe(first);
  });

  it("delegates signIn/signUp/signOut to the Supabase client", async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.signIn("a@b.com", "pw");
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pw",
    });

    result.current.signUp("a@b.com", "pw");
    expect(authMock.signUp).toHaveBeenCalledWith({ email: "a@b.com", password: "pw" });

    result.current.signOut();
    expect(authMock.signOut).toHaveBeenCalledTimes(1);
  });

  it("throws when used outside an AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within AuthProvider");
  });
});
