import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    useConsentStatusMock.mockReturnValue({ canEnableMic: true, ageAttested: true, loading: false });
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
    useConsentStatusMock.mockReturnValue({
      canEnableMic: false,
      ageAttested: false,
      loading: false,
    });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/consent" }));
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  // SCRUM-24 follow-up: audio-sharing consent alone was never
  // adult-eligibility evidence -- a caller with mic consent but no
  // attestation must still be sent back to the consent page.
  it("redirects to /consent once consent finishes with canEnableMic true but ageAttested false", async () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1" },
      session: { user: { id: "u1" } },
      loading: false,
    });
    useConsentStatusMock.mockReturnValue({
      canEnableMic: true,
      ageAttested: false,
      loading: false,
    });
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

  it("requireConsent=false renders children and never redirects, regardless of consent state", () => {
    pathname = "/account";
    useAuthMock.mockReturnValue({
      user: { id: "u1" },
      session: { user: { id: "u1" } },
      loading: false,
    });
    useConsentStatusMock.mockReturnValue({ canEnableMic: false, loading: false });
    render(
      <ProtectedRoute requireConsent={false}>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText("secret content")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("requireConsent=false calls useConsentStatus with a null session, never fetching status for the gate", () => {
    pathname = "/account";
    useAuthMock.mockReturnValue({
      user: { id: "u1" },
      session: { user: { id: "u1" } },
      loading: false,
    });
    useConsentStatusMock.mockReturnValue({ canEnableMic: false, loading: false });
    render(
      <ProtectedRoute requireConsent={false}>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    expect(useConsentStatusMock).toHaveBeenCalledWith(null);
  });

  it("requireConsent=false still redirects an unauthenticated user to redirectTo", async () => {
    pathname = "/account";
    useAuthMock.mockReturnValue({ user: null, session: null, loading: false });
    render(
      <ProtectedRoute requireConsent={false}>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/login" }));
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  // A failed status fetch says nothing about the caller's consent, so it
  // mustn't bounce an already-consented student to /consent.
  it("shows a retry prompt instead of redirecting when the consent check fails", async () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1" },
      session: { user: { id: "u1" } },
      loading: false,
    });
    const refresh = vi.fn();
    useConsentStatusMock.mockReturnValue({
      canEnableMic: false,
      ageAttested: false,
      loading: false,
      error: "network down",
      refresh,
    });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText(/couldn't check your consent status/i)).toBeInTheDocument();
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refresh).toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("keeps rendering children when a background refetch fails but cached consent is satisfied", () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1" },
      session: { user: { id: "u1" } },
      loading: false,
    });
    useConsentStatusMock.mockReturnValue({
      canEnableMic: true,
      ageAttested: true,
      loading: false,
      error: "network down",
    });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText("secret content")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
