import { expect, test } from "@playwright/test";

import { gotoReady, mockApi } from "./mocks";

const ROOM_ID = "room-1";

// The live LiveKit connection itself (session.$roomId.tsx's useLiveRoom)
// intentionally isn't mocked -- it'll fail to reach the fake wss:// url
// and surface a connection-error banner, which doesn't block any of this
// -- the leave button, confirmation dialog, and its actions all render and
// work regardless of live-audio connection state.
test.beforeEach(async ({ page }) => {
  await mockApi(page, "/api/consent/status", {
    currentVersion: 1,
    canEnableMic: true,
    ageAttested: true,
  });
  await mockApi(page, `/api/rooms/${ROOM_ID}/status`, {
    id: ROOM_ID,
    status: "live",
    code: "GD-1234",
    topicText: "Is AI making engineers less employable?",
    durationSeconds: 900,
    isCreator: true,
    endsAt: Date.now() + 900_000,
  });
  await mockApi(page, `/api/rooms/${ROOM_ID}/participants`, { participants: [] });
  await mockApi(page, `/api/rooms/${ROOM_ID}/token`, {
    token: "fake-livekit-token",
    url: "wss://mock.livekit.test",
    identity: "u1",
    roomName: ROOM_ID,
  });
});

test("clicking Leave shows a confirmation instead of leaving immediately", async ({ page }) => {
  await gotoReady(page, `/session/${ROOM_ID}`);

  await page.getByRole("button", { name: "Leave" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Leave the discussion?")).toBeVisible();
  await expect(
    dialog.getByText("Leaving early means no AI feedback for this session."),
  ).toBeVisible();
});

test("Stay dismisses the dialog and keeps the student in the session", async ({ page }) => {
  await gotoReady(page, `/session/${ROOM_ID}`);
  await page.getByRole("button", { name: "Leave" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Stay" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/session/${ROOM_ID}`));
});

test("confirming Leave navigates back to the room's lobby", async ({ page }) => {
  await gotoReady(page, `/session/${ROOM_ID}`);
  await page.getByRole("button", { name: "Leave" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Leave" }).click();

  await expect(page).toHaveURL(new RegExp(`/lobby/${ROOM_ID}`));
});
