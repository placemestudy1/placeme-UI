import { expect, test, type Page } from "@playwright/test";

import { fakeGoTrueSession, gotoReady, mockApi, type FakeConsentClaims } from "./mocks";

// SPEC-0015: with gd-proto's access-token hook enabled, the session token
// carries the caller's consent state (placeme_consent), so routing never
// has to ask GET /api/consent/status. These start signed out and log in
// through the form so the session holds a claim-bearing token.
test.use({ storageState: { cookies: [], origins: [] } });

const ROOM_ID = "room-1";

// Serves every Supabase token request (password sign-in and refresh) with a
// session whose claim reflects `current()` at the time of the request --
// like the real hook, which recomputes the claim on every issue.
async function mockTokenEndpoint(page: Page, current: () => FakeConsentClaims) {
  await page.route("**/auth/v1/token*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fakeGoTrueSession({ consentClaims: current() })),
    }),
  );
}

// Counts GET /api/consent/status calls (answering them, so a regression
// shows up as a non-zero count rather than a network error).
async function countStatusRequests(page: Page) {
  const counter = { count: 0 };
  await page.route("**/api/consent/status", (route) => {
    counter.count += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ currentVersion: 2, canEnableMic: true, ageAttested: true }),
    });
  });
  return counter;
}

async function logIn(page: Page) {
  await gotoReady(page, "/login");
  await page.getByPlaceholder("you@college.edu").fill("aarav.menon@nitk.edu.in");
  await page.getByPlaceholder("••••••••").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
}

async function clickNav(page: Page, name: string) {
  await page.getByRole("link", { name, exact: true }).filter({ visible: true }).first().click();
}

// The original complaint: every page change waited on "Checking your
// consent status…".
test("moving between pages never waits on or requests consent status", async ({ page }) => {
  await mockTokenEndpoint(page, () => ({ can_enable_mic: true, age_attested: true }));
  const status = await countStatusRequests(page);
  await mockApi(page, "/api/history/mine", { sessions: [] });
  await mockApi(page, "/api/rooms/open", { rooms: [] });

  await logIn(page);
  await expect(page).toHaveURL("/");

  for (const [name, url] of [
    ["History", "/history"],
    ["Join", "/join"],
    ["Random", "/match"],
    ["Home", "/"],
  ] as const) {
    await clickNav(page, name);
    await expect(page).toHaveURL(url);
    await expect(page.getByText("Checking your consent status…")).toHaveCount(0);
  }
  expect(status.count).toBe(0);
});

test("a claim without consent routes to /consent; granting reissues the token and unlocks the app", async ({
  page,
}) => {
  let granted = false;
  let attested = false;
  await mockTokenEndpoint(page, () => ({ can_enable_mic: granted, age_attested: attested }));
  const status = await countStatusRequests(page);
  await page.route("**/api/consent", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    granted = true;
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ consentVersion: 2, grantedAt: new Date().toISOString() }),
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
  await mockApi(page, "/api/history/mine", { sessions: [] });
  await mockApi(page, "/api/rooms/open", { rooms: [] });

  await logIn(page);
  await expect(page).toHaveURL("/consent");
  await expect(page.getByText("Allow PlaceMe to use your microphone")).toBeVisible();

  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Allow & continue" }).click();
  await expect(page.getByText("Consent recorded")).toBeVisible();

  await page.getByRole("link", { name: "Continue to dashboard" }).click();
  await expect(page).toHaveURL("/");
  expect(status.count).toBe(0);
});

// Stale claim: consent was withdrawn elsewhere after this token was issued.
// The server's consentGate refuses the LiveKit token mint regardless of the
// claim; the client then reissues its token and is routed to /consent.
test("a stale consented claim is corrected when the server refuses the room token", async ({
  page,
}) => {
  let withdrawnElsewhere = false;
  await mockTokenEndpoint(page, () => ({
    can_enable_mic: !withdrawnElsewhere,
    age_attested: true,
  }));
  await countStatusRequests(page);
  await mockApi(page, "/api/history/mine", { sessions: [] });
  await mockApi(page, "/api/rooms/open", { rooms: [] });
  await mockApi(page, `/api/rooms/${ROOM_ID}/status`, {
    id: ROOM_ID,
    status: "live",
    code: "GD-1234",
    topicText: "Should campus placements weigh GD performance?",
    durationSeconds: 900,
    isCreator: true,
    endsAt: Date.now() + 900_000,
  });
  await mockApi(page, `/api/rooms/${ROOM_ID}/participants`, {
    participants: [{ userId: "u1", displayName: "Aarav Menon", talkShare: 0 }],
  });
  await mockApi(
    page,
    `/api/rooms/${ROOM_ID}/token`,
    { error: "consent_required" },
    { method: "POST", status: 403 },
  );

  await logIn(page);
  await expect(page).toHaveURL("/");

  withdrawnElsewhere = true;
  await page.goto(`/session/${ROOM_ID}`);
  await expect(page).toHaveURL("/consent");
});
