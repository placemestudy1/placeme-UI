import { expect, test } from "@playwright/test";

import { gotoReady, mockApi } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApi(page, "/api/consent/status", {
    currentVersion: 1,
    canEnableMic: true,
    ageAttested: true,
  });
});

test.describe("create room", () => {
  test("creates a room with the default topic and lands in its lobby", async ({ page }) => {
    await mockApi(
      page,
      "/api/topics/custom",
      { id: "t1", text: "Is AI making engineers less employable?" },
      { method: "POST" },
    );
    await mockApi(
      page,
      "/api/rooms",
      { id: "room-1", code: "GD-1234", status: "waiting" },
      { method: "POST" },
    );

    await gotoReady(page, "/rooms/new");
    const seats = page.locator('input[type="number"][min="3"][max="12"]');
    await expect(seats).toHaveValue("6");
    await expect(
      page.getByText("Room capacity can be set from 3 to 12 participants."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Create room" }).click();

    await expect(page).toHaveURL(/\/lobby\/room-1/);
  });

  for (const capacity of [3, 12]) {
    test(`submits the supported ${capacity}-seat boundary`, async ({ page }) => {
      await mockApi(
        page,
        "/api/topics/custom",
        { id: "t1", text: "Is AI making engineers less employable?" },
        { method: "POST" },
      );
      let submittedCapacity: number | undefined;
      await page.route("**/api/rooms", (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        submittedCapacity = (route.request().postDataJSON() as { maxParticipants?: number })
          .maxParticipants;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: `room-${capacity}`, code: "GD-1234", status: "waiting" }),
        });
      });

      await gotoReady(page, "/rooms/new");
      await page.locator('input[type="number"][min="3"][max="12"]').fill(String(capacity));
      await page.getByRole("button", { name: "Create room" }).click();

      await expect(page).toHaveURL(new RegExp(`/lobby/room-${capacity}`));
      expect(submittedCapacity).toBe(capacity);
    });
  }

  test("offers every supported capacity on the mobile route", async ({ page }) => {
    await gotoReady(page, "/app/new");
    const seats = page.getByText("Seats", { exact: true }).locator("..").locator("select");
    await expect(seats.locator("option")).toHaveCount(10);
    await expect(seats.locator("option").first()).toHaveAttribute("value", "3");
    await expect(seats.locator("option").last()).toHaveAttribute("value", "12");
  });

  test("surfaces a room-creation error instead of navigating away", async ({ page }) => {
    await mockApi(
      page,
      "/api/topics/custom",
      { id: "t1", text: "Is AI making engineers less employable?" },
      { method: "POST" },
    );
    await mockApi(
      page,
      "/api/rooms",
      { error: "Pilot room capacity reached" },
      { method: "POST", status: 429 },
    );

    await gotoReady(page, "/rooms/new");
    await page.getByRole("button", { name: "Create room" }).click();

    await expect(page.getByText("Pilot room capacity reached")).toBeVisible();
    await expect(page).toHaveURL("/rooms/new");
  });
});

test.describe("join room", () => {
  test("lists open rooms fetched from the server", async ({ page }) => {
    await mockApi(page, "/api/rooms/open", {
      rooms: [
        {
          id: "room-3",
          code: "GD-9999",
          topicText: "Remote work vs. office culture for freshers",
          durationSeconds: 900,
          maxParticipants: 6,
          participantCount: 3,
          hostDisplayName: "Ishita Rao",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await gotoReady(page, "/join");
    await expect(
      page.getByText("A room code can be used only while that room is waiting to start."),
    ).toBeVisible();
    await expect(page.getByText("Remote work vs. office culture for freshers")).toBeVisible();
    await expect(page.getByText("Ishita Rao")).toBeVisible();
  });

  test("joins a room by code and lands in its lobby", async ({ page }) => {
    await mockApi(page, "/api/rooms/open", { rooms: [] });
    await mockApi(
      page,
      "/api/rooms/join",
      { id: "room-2", code: "GD-5678", status: "waiting" },
      { method: "POST" },
    );

    await gotoReady(page, "/join");
    await page.getByPlaceholder("GD-0000").fill("gd-5678");
    await page.getByRole("button", { name: "Join room" }).click();

    await expect(page).toHaveURL(/\/lobby\/room-2/);
  });
});
