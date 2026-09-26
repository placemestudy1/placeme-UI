import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIsMobile } from "./use-mobile";

// jsdom has no matchMedia; stub one whose "change" listeners the test can fire.
function stubViewport(width: number) {
  const listeners = new Set<() => void>();
  const mql = {
    addEventListener: vi.fn((_: string, cb: () => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: () => void) => listeners.delete(cb)),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mql),
  );
  window.innerWidth = width;

  return {
    mql,
    resize(next: number) {
      window.innerWidth = next;
      act(() => listeners.forEach((cb) => cb()));
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIsMobile", () => {
  it("is true on a narrow viewport", () => {
    stubViewport(500);
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
  });

  it("is false on a wide viewport", () => {
    stubViewport(1024);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });

  it.each([
    [767, true],
    [768, false],
  ])("treats width %i as mobile=%s (768px breakpoint)", (width, expected) => {
    stubViewport(width);
    expect(renderHook(() => useIsMobile()).result.current).toBe(expected);
  });

  it("updates when the media query fires a change", () => {
    const viewport = stubViewport(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    viewport.resize(500);

    expect(result.current).toBe(true);
  });

  it("removes its change listener on unmount", () => {
    const { mql } = stubViewport(1024);
    const { unmount } = renderHook(() => useIsMobile());
    const listener = mql.addEventListener.mock.calls[0]?.[1];
    expect(listener).toBeTypeOf("function");

    unmount();

    expect(mql.removeEventListener).toHaveBeenCalledWith("change", listener);
  });
});
