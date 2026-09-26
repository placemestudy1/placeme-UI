import { expect, test } from "@playwright/test";

import { gotoReady, mockApi } from "./mocks";

// SCRUM-82: the /app/* native-shell routes were live in production before
// being parked, so their URLs must redirect to the web equivalents rather
// than 404 (mapping unit-tested in src/lib/legacy-app-redirect.test.ts).

test.beforeEach(async ({ page }) => {
  await mockApi(page, "/api/consent/status", {
    currentVersion: 1,
    canEnableMic: true,
    ageAttested: true,
  });
  await mockApi(page, "/api/history/mine", { sessions: [] });
  await mockApi(page, "/api/rooms/open", { rooms: [] });
});

test("an old /app/lobby link opens that room's web lobby", async ({ page }) => {
  await mockApi(page, "/api/rooms/room-1/status", {
    id: "room-1",
    status: "waiting",
    code: "GD-1234",
    topicText: "Is AI making engineers less employable?",
    durationSeconds: 900,
    isCreator: false,
  });
  await mockApi(page, "/api/rooms/room-1/participants", { participants: [] });

  await gotoReady(page, "/app/lobby?roomId=room-1");

  await expect(page).toHaveURL(/\/lobby\/room-1$/);
  await expect(page).toHaveTitle("Room lobby · PlaceMe");
});

test("the old mobile home and screens land on their web pages, not the 404", async ({ page }) => {
  await gotoReady(page, "/app");
  await expect(page).toHaveURL(/\/$/);
  await expect(page).not.toHaveTitle(/not found/i);

  await gotoReady(page, "/app/new");
  await expect(page).toHaveURL(/\/rooms\/new$/);
  await expect(page).toHaveTitle("Create a room · PlaceMe");
});

test("unknown non-/app paths still show the 404", async ({ page }) => {
  await gotoReady(page, "/definitely-not-a-page");
  await expect(page).toHaveTitle("Page not found · PlaceMe");
});
