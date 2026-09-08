import { expect, test } from "@playwright/test";

import { gotoReady, mockApi } from "./mocks";

const ROOM_ID = "room-1";
const TOPIC = "Is AI making engineers less employable?";

test.beforeEach(async ({ page }) => {
  await mockApi(page, "/api/consent/status", {
    currentVersion: 1,
    canEnableMic: true,
    ageAttested: true,
  });
});

test("shows the topic, code, and participants; host sees Start discussion", async ({ page }) => {
  await mockApi(page, `/api/rooms/${ROOM_ID}/status`, {
    id: ROOM_ID,
    status: "waiting",
    code: "GD-1234",
    topicText: TOPIC,
    durationSeconds: 900,
    isCreator: true,
  });
  await mockApi(page, `/api/rooms/${ROOM_ID}/participants`, {
    participants: [{ userId: "u1", displayName: "Aarav Menon", talkShare: 0 }],
  });

  await gotoReady(page, `/lobby/${ROOM_ID}`);

  await expect(page.getByText(TOPIC)).toBeVisible();
  // WebShell's subtitle also contains the code (desktop + mobile headers
  // both in the DOM) alongside the copy-code chip -- .first() confirms
  // it's rendered without depending on which element wins.
  await expect(page.getByText("GD-1234").first()).toBeVisible();
  await expect(page.getByText("Aarav Menon")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start discussion" })).toBeVisible();
});

test("a non-host sees a disabled waiting state instead of Start discussion", async ({ page }) => {
  await mockApi(page, `/api/rooms/${ROOM_ID}/status`, {
    id: ROOM_ID,
    status: "waiting",
    code: "GD-1234",
    topicText: TOPIC,
    durationSeconds: 900,
    isCreator: false,
  });
  await mockApi(page, `/api/rooms/${ROOM_ID}/participants`, { participants: [] });

  await gotoReady(page, `/lobby/${ROOM_ID}`);

  const waiting = page.getByRole("button", { name: "Waiting for host…" });
  await expect(waiting).toBeVisible();
  await expect(waiting).toBeDisabled();
  await expect(page.getByRole("button", { name: "Start discussion" })).toHaveCount(0);
});

test("starting the room moves everyone into the live session once the status poll picks it up", async ({
  page,
}) => {
  let started = false;
  await page.route(`**/api/rooms/${ROOM_ID}/status`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: ROOM_ID,
        status: started ? "live" : "waiting",
        code: "GD-1234",
        topicText: TOPIC,
        durationSeconds: 900,
        isCreator: true,
        endsAt: Date.now() + 900_000,
      }),
    }),
  );
  await page.route(`**/api/rooms/${ROOM_ID}/start`, (route) => {
    started = true;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: ROOM_ID, status: "live", endsAt: Date.now() + 900_000 }),
    });
  });
  await mockApi(page, `/api/rooms/${ROOM_ID}/participants`, { participants: [] });
  await mockApi(page, `/api/rooms/${ROOM_ID}/token`, {
    token: "fake-livekit-token",
    url: "wss://mock.livekit.test",
    identity: "u1",
    roomName: ROOM_ID,
  });

  await gotoReady(page, `/lobby/${ROOM_ID}`);
  await page.getByRole("button", { name: "Start discussion" }).click();

  // The lobby's status poll runs every 3s (POLL_INTERVAL_MS in
  // lobby.$roomId.tsx) -- give it room for at least one more tick.
  await expect(page).toHaveURL(new RegExp(`/session/${ROOM_ID}`), { timeout: 6000 });
});
