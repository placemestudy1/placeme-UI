import { expect, test } from "@playwright/test";

import { gotoReady, mockApi } from "./mocks";

test("shows the already-granted state immediately when consent is already on file", async ({
  page,
}) => {
  await mockApi(page, "/api/consent/status", { currentVersion: 1, canEnableMic: true });
  await gotoReady(page, "/consent");
  await expect(page.getByText("Consent recorded")).toBeVisible();
});

test("requests the mic and records consent, then shows the granted state", async ({ page }) => {
  // A tiny stateful mock: canEnableMic flips true only after the POST
  // /api/consent handler below has actually run, so the UI's "granted"
  // state genuinely depends on the record-then-refresh round trip
  // (useConsentStatus's grantConsent()), not just a static fixture.
  let granted = false;
  await page.route("**/api/consent/status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ currentVersion: 1, canEnableMic: granted }),
    }),
  );
  await page.route("**/api/consent", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    granted = true;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ consentVersion: 1, grantedAt: new Date().toISOString() }),
    });
  });

  await gotoReady(page, "/consent");
  await expect(page.getByText("Allow PlaceMe to use your microphone")).toBeVisible();

  await page.getByRole("button", { name: "Allow & continue" }).click();

  await expect(page.getByText("Consent recorded")).toBeVisible();
});

test("shows a denied banner when mic permission is rejected", async ({ page }) => {
  await mockApi(page, "/api/consent/status", { currentVersion: 1, canEnableMic: false });
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });

  await gotoReady(page, "/consent");
  await page.getByRole("button", { name: "Allow & continue" }).click();

  await expect(page.getByText("Microphone access was denied")).toBeVisible();
});
