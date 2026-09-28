import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isNotFound } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, fromMock } = vi.hoisted(() => {
  const selectMock = vi.fn();
  return { selectMock, fromMock: vi.fn(() => ({ select: selectMock })) };
});
vi.mock("./supabase-client", () => ({ supabase: { from: fromMock } }));

import {
  fetchFeatureFlags,
  isFlagOn,
  requireFeatureFlag,
  useFeatureFlag,
  visibleNavItems,
} from "./feature-flags";

const rows = (data: { key: string; enabled: boolean | null }[]) => ({ data, error: null });
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => {
  selectMock.mockReset();
  fromMock.mockClear();
});

describe("fetchFeatureFlags", () => {
  it("reads feature_flags into a key → enabled map", async () => {
    selectMock.mockResolvedValue(
      rows([
        { key: "mcq", enabled: true },
        { key: "jam", enabled: null },
      ]),
    );
    expect(await fetchFeatureFlags()).toEqual({ mcq: true, jam: false });
    expect(fromMock).toHaveBeenCalledWith("feature_flags");
    expect(selectMock).toHaveBeenCalledWith("key, enabled");
  });

  it("throws when Supabase returns an error", async () => {
    selectMock.mockResolvedValue({ data: null, error: new Error("relation does not exist") });
    await expect(fetchFeatureFlags()).rejects.toThrow("relation does not exist");
  });
});

describe("isFlagOn", () => {
  it("is true only for an enabled flag", () => {
    expect(isFlagOn({ mcq: true }, "mcq")).toBe(true);
    expect(isFlagOn({ mcq: false }, "mcq")).toBe(false);
    expect(isFlagOn({}, "mcq")).toBe(false);
    expect(isFlagOn(undefined, "mcq")).toBe(false);
  });
});

describe("useFeatureFlag", () => {
  function wrapper(client: QueryClient) {
    return ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
  }

  it("is off while loading, then follows the row", async () => {
    selectMock.mockResolvedValue(rows([{ key: "mcq", enabled: true }]));
    const { result } = renderHook(() => useFeatureFlag("mcq"), { wrapper: wrapper(newClient()) });
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays off when the flags can't be read", async () => {
    selectMock.mockResolvedValue({ data: null, error: new Error("down") });
    const client = newClient();
    const { result } = renderHook(() => useFeatureFlag("mcq"), { wrapper: wrapper(client) });
    // featureFlagsQueryOptions retries once (~1s) before settling on error.
    await waitFor(() => expect(client.getQueryState(["feature-flags"])?.status).toBe("error"), {
      timeout: 3000,
    });
    expect(result.current).toBe(false);
  });
});

describe("requireFeatureFlag", () => {
  async function thrown(promise: Promise<void>) {
    try {
      await promise;
      return undefined;
    } catch (err) {
      return err;
    }
  }

  it("lets the route load while the flag is on", async () => {
    selectMock.mockResolvedValue(rows([{ key: "mcq", enabled: true }]));
    await expect(requireFeatureFlag(newClient(), "mcq")).resolves.toBeUndefined();
  });

  it("throws notFound while the flag is off", async () => {
    selectMock.mockResolvedValue(rows([{ key: "mcq", enabled: false }]));
    expect(isNotFound(await thrown(requireFeatureFlag(newClient(), "mcq")))).toBe(true);
  });

  it("throws notFound when the flag has no row", async () => {
    selectMock.mockResolvedValue(rows([]));
    expect(isNotFound(await thrown(requireFeatureFlag(newClient(), "mcq")))).toBe(true);
  });

  it("throws notFound when the flags can't be read", async () => {
    selectMock.mockResolvedValue({ data: null, error: new Error("down") });
    expect(isNotFound(await thrown(requireFeatureFlag(newClient(), "mcq")))).toBe(true);
  });
});

describe("visibleNavItems", () => {
  const items = [
    { to: "/", label: "Home" },
    { to: "/mcq", label: "Tests", flag: "mcq" },
  ];

  it("hides a flagged nav entry while its flag is off", () => {
    expect(visibleNavItems(items, { mcq: false }).map((i) => i.to)).toEqual(["/"]);
    expect(visibleNavItems(items, undefined).map((i) => i.to)).toEqual(["/"]);
  });

  it("shows it once the flag is on", () => {
    expect(visibleNavItems(items, { mcq: true }).map((i) => i.to)).toEqual(["/", "/mcq"]);
  });
});
