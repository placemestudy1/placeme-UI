import { expect, test } from "@playwright/test";

import { gotoReady, mockApi } from "./mocks";

test("shows the already-granted state immediately when consent and adult attestation are both on file", async ({
  page,
}) => {
  await mockApi(page, "/api/consent/status", {
    currentVersion: 1,
    canEnableMic: true,
    ageAttested: true,
  });
  await gotoReady(page, "/consent");
  await expect(page.getByText("Consent recorded")).toBeVisible();
});

// SCRUM-24 follow-up: mic consent on file but the separate 18+ attestation
// (added after some accounts already had consent) is still missing.
test("prompts for the separate adult attestation when consent is on file but attestation is not", async ({
  page,
}) => {
  await mockApi(page, "/api/consent/status", {
    currentVersion: 1,
    canEnableMic: true,
    ageAttested: false,
  });
  await gotoReady(page, "/consent");
  await expect(page.getByText("I confirm that I am 18 years of age or older.")).toBeVisible();

  await expect(page.getByRole("button", { name: "Confirm & continue" })).toBeDisabled();
  await page.getByRole("checkbox").click();

  await page.route("**/api/consent/age-attestation", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ageAttested: true, ageAttestedAt: new Date().toISOString() }),
    }),
  );
  await mockApi(page, "/api/consent/status", {
    currentVersion: 1,
    canEnableMic: true,
    ageAttested: true,
  });

  await page.getByRole("button", { name: "Confirm & continue" }).click();
  await expect(page.getByText("Consent recorded")).toBeVisible();
});

test("requests the mic and records consent plus the adult attestation, then shows the granted state", async ({
  page,
}) => {
  // A tiny stateful mock: canEnableMic/ageAttested flip true only after
  // their respective POST handlers below have actually run, so the UI's
  // "granted" state genuinely depends on the record-then-refresh round
  // trip (useConsentStatus's grantConsent()/confirmAdult()), not just a
  // static fixture.
  let granted = false;
  let attested = false;
  await page.route("**/api/consent/status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ currentVersion: 1, canEnableMic: granted, ageAttested: attested }),
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
  await page.route("**/api/consent/age-attestation", (route) => {
    attested = true;
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ageAttested: true, ageAttestedAt: new Date().toISOString() }),
    });
  });

  await gotoReady(page, "/consent");
  await expect(page.getByText("Allow PlaceMe to use your microphone")).toBeVisible();

  await expect(page.getByRole("button", { name: "Allow & continue" })).toBeDisabled();
  await page.getByRole("checkbox").click();

  await page.getByRole("button", { name: "Allow & continue" }).click();

  await expect(page.getByText("Consent recorded")).toBeVisible();
});

test("shows a denied banner when mic permission is rejected", async ({ page }) => {
  await mockApi(page, "/api/consent/status", {
    currentVersion: 1,
    canEnableMic: false,
    ageAttested: false,
  });
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });

  await gotoReady(page, "/consent");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Allow & continue" }).click();

  await expect(page.getByText("Microphone access was denied")).toBeVisible();
});
