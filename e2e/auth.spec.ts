import { expect, test } from "@playwright/test";

import { gotoReady, mockApi, mockSupabaseAuth } from "./mocks";

// Overrides the project-level authenticated storageState (see
// playwright.config.ts) -- these tests specifically need to start signed
// out to exercise the login/signup forms themselves.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("login", () => {
  test("routes to /consent when consent hasn't been granted yet", async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockApi(page, "/api/consent/status", { currentVersion: 1, canEnableMic: false });

    await gotoReady(page, "/login");
    await page.getByPlaceholder("you@college.edu").fill("aarav.menon@nitk.edu.in");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/consent");
  });

  test("routes straight home when consent was already granted", async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockApi(page, "/api/consent/status", { currentVersion: 1, canEnableMic: true });

    await gotoReady(page, "/login");
    await page.getByPlaceholder("you@college.edu").fill("aarav.menon@nitk.edu.in");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/");
  });

  test("shows the server's error message on invalid credentials and stays on /login", async ({
    page,
  }) => {
    await page.route("**/auth/v1/token*", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid login credentials",
        }),
      }),
    );

    await gotoReady(page, "/login");
    await page.getByPlaceholder("you@college.edu").fill("aarav.menon@nitk.edu.in");
    await page.getByPlaceholder("••••••••").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Invalid login credentials")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("signup", () => {
  test("creates an account and routes to the one-time consent gate", async ({ page }) => {
    await mockSupabaseAuth(page);

    await gotoReady(page, "/signup");
    await page.getByPlaceholder("Aarav Menon").fill("Ishita Rao");
    await page.getByPlaceholder("you@college.edu").fill("ishita.rao@vit.ac.in");
    await page.getByPlaceholder("NITK Surathkal").fill("VIT Vellore");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/consent");
  });
});
