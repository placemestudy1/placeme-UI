import { test as setup } from "@playwright/test";

import { gotoReady, mockApi, mockSupabaseAuth } from "./mocks";

const authFile = "e2e/.auth/user.json";

// Runs once before the "chromium" project (see playwright.config.ts's
// `dependencies: ["setup"]"): logs in through a mocked Supabase, then
// saves the resulting browser storage state so every other spec starts
// already signed in instead of re-running the login form each time.
// auth.spec.ts overrides this default via `test.use({ storageState: ... })`
// since it specifically needs to start unauthenticated.
setup("authenticate", async ({ page }) => {
  await mockSupabaseAuth(page);
  await mockApi(page, "/api/consent/status", { currentVersion: 1, canEnableMic: true });

  await gotoReady(page, "/login");
  await page.getByPlaceholder("you@college.edu").fill("aarav.menon@nitk.edu.in");
  await page.getByPlaceholder("••••••••").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL("/");
  await page.context().storageState({ path: authFile });
});
