import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
let pathname = "/";
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useRouterState: () => pathname,
}));

const useAuthMock = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

const useConsentStatusMock = vi.fn();
vi.mock("@/lib/use-consent-status", () => ({
  useConsentStatus: (session: unknown) => useConsentStatusMock(session),
}));

import { ProtectedRoute } from "./protected-route";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    pathname = "/";
    useConsentStatusMock.mockReturnValue({ canEnableMic: true, loading: false });
  });

  it("renders children once a signed-in, consented user is confirmed", () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1" },
      session: { user: { id: "u1" } },
      loading: false,
    });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText("secret content")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("shows a loading placeholder instead of children while auth is resolving", () => {
    useAuthMock.mockReturnValue({ user: null, session: null, loading: true });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("redirects to /login once loading finishes with no user", async () => {
    useAuthMock.mockReturnValue({ user: null, session: null, loading: false });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/login" }));
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("shows a loading placeholder instead of children while consent is resolving", () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1" },
      session: { user: { id: "u1" } },
      loading: false,
    });
    useConsentStatusMock.mockReturnValue({ canEnableMic: false, loading: true });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
    expect(screen.getByText(/checking your consent status/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("redirects to /consent once consent finishes with canEnableMic false", async () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1" },
      session: { user: { id: "u1" } },
      loading: false,
    });
    useConsentStatusMock.mockReturnValue({ canEnableMic: false, loading: false });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/consent" }));
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("does not redirect away from /consent even when canEnableMic is false", () => {
    pathname = "/consent";
    useAuthMock.mockReturnValue({
      user: { id: "u1" },
      session: { user: { id: "u1" } },
      loading: false,
    });
    useConsentStatusMock.mockReturnValue({ canEnableMic: false, loading: false });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText("secret content")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
