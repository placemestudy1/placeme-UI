import { act, renderHook, waitFor } from "@testing-library/react";
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
  },
}));
vi.mock("./supabase-client", () => ({ supabase: { auth: authMock } }));

import { AuthProvider, useAuth } from "./auth-context";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function fakeSession(userId: string): Session {
  return { access_token: "t", user: { id: userId } } as unknown as Session;
}

describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
