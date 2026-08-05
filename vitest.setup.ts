import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// @testing-library/react's automatic post-test cleanup only self-registers
// when it detects a global `afterEach` (the Jest-style convention); this
// project intentionally doesn't set vitest's `test.globals: true`, so wire
// it up explicitly instead.
afterEach(() => {
  cleanup();
});
