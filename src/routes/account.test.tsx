// Functional tests for the "Privacy & your data" section (SPEC-0012 R5/AC5):
// withdrawing consent and submitting an account-deletion request, including
// their confirmation copy and error handling. Mocks @tanstack/react-router
// the same way protected-route.test.tsx does, since WebShell (rendered
// underneath) also depends on it.
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: { component: unknown }) => ({ options: opts }),
  useNavigate: () => vi.fn(),
  useRouterState: () => "/account",
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const useAuthMock = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

const useConsentStatusMock = vi.fn();
vi.mock("@/lib/use-consent-status", () => ({
  useConsentStatus: (session: unknown) => useConsentStatusMock(session),
}));

const withdrawConsentMock = vi.fn();
const requestAccountDeletionMock = vi.fn();
vi.mock("@/lib/api", () => ({
  withdrawConsent: (...args: unknown[]) => withdrawConsentMock(...args),
  requestAccountDeletion: (...args: unknown[]) => requestAccountDeletionMock(...args),
}));

import { Route } from "./account";

const AccountPage = Route.options.component as React.ComponentType;
const fakeSession = { access_token: "t" };

describe("AccountPage — Privacy & your data", () => {
  beforeEach(() => {
    withdrawConsentMock.mockReset();
    requestAccountDeletionMock.mockReset();
    useAuthMock.mockReturnValue({
      user: { id: "u1", email: "student@college.edu" },
      session: fakeSession,
      loading: false,
      signOut: vi.fn(),
    });
    useConsentStatusMock.mockReturnValue({
      canEnableMic: true,
      loading: false,
      refresh: vi.fn(),
    });
  });

  it("withdraws consent and shows the confirmation banner", async () => {
    withdrawConsentMock.mockResolvedValue({ canEnableMic: false });
    render(<AccountPage />);

    screen.getByRole("button", { name: /withdraw consent/i }).click();

    await waitFor(() => expect(withdrawConsentMock).toHaveBeenCalledWith(fakeSession));
    expect(await screen.findByText(/consent withdrawn/i)).toBeInTheDocument();
  });

  it("disables the withdraw button once consent is already withdrawn", () => {
    useConsentStatusMock.mockReturnValue({
      canEnableMic: false,
      loading: false,
      refresh: vi.fn(),
    });
    render(<AccountPage />);
    expect(screen.getByRole("button", { name: /withdraw consent/i })).toBeDisabled();
  });

  it("shows an error banner when withdrawal fails, without claiming success", async () => {
    withdrawConsentMock.mockRejectedValue(new Error("network down"));
    render(<AccountPage />);

    screen.getByRole("button", { name: /withdraw consent/i }).click();

    expect(await screen.findByText(/couldn't withdraw consent/i)).toBeInTheDocument();
    expect(screen.getByText("network down")).toBeInTheDocument();
    expect(screen.queryByText(/consent withdrawn/i)).not.toBeInTheDocument();
  });

  it("submits an account-deletion request and shows honest, non-instant confirmation copy", async () => {
    requestAccountDeletionMock.mockResolvedValue({ requestedAt: "2026-09-07T00:00:00.000Z" });
    render(<AccountPage />);

    screen.getByRole("button", { name: /request account deletion/i }).click();

    await waitFor(() => expect(requestAccountDeletionMock).toHaveBeenCalledWith(fakeSession));
    expect(await screen.findByText(/deletion request submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/founder will process it manually/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deletion requested/i })).toBeDisabled();
  });

  it("does not submit a second deletion request once one is already pending", async () => {
    requestAccountDeletionMock.mockResolvedValue({ requestedAt: "2026-09-07T00:00:00.000Z" });
    render(<AccountPage />);

    const button = screen.getByRole("button", { name: /request account deletion/i });
    button.click();
    await waitFor(() => expect(requestAccountDeletionMock).toHaveBeenCalledTimes(1));

    screen.getByRole("button", { name: /deletion requested/i }).click();
    expect(requestAccountDeletionMock).toHaveBeenCalledTimes(1);
  });

  it("shows an error banner when the deletion request fails, without claiming success", async () => {
    requestAccountDeletionMock.mockRejectedValue(new Error("server error"));
    render(<AccountPage />);

    screen.getByRole("button", { name: /request account deletion/i }).click();

    expect(await screen.findByText(/couldn't submit request/i)).toBeInTheDocument();
    expect(screen.getByText("server error")).toBeInTheDocument();
    expect(screen.queryByText(/deletion request submitted/i)).not.toBeInTheDocument();
  });
});
