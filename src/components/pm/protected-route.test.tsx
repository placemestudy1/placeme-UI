import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

const useAuthMock = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

import { ProtectedRoute } from "./protected-route";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("renders children once a signed-in user is confirmed", () => {
    useAuthMock.mockReturnValue({ user: { id: "u1" }, loading: false });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText("secret content")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("shows a loading placeholder instead of children while auth is resolving", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
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
    useAuthMock.mockReturnValue({ user: null, loading: false });
    render(
      <ProtectedRoute>
        <p>secret content</p>
      </ProtectedRoute>,
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/login" }));
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });
});
