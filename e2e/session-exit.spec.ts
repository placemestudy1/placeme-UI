import { expect, test } from "@playwright/test";

import { gotoReady, mockApi } from "./mocks";

const ROOM_ID = "room-1";

// The live LiveKit connection itself (session.$roomId.tsx's useLiveRoom)
// intentionally isn't mocked -- it'll fail to reach the fake wss:// url
// and surface a connection-error banner, which doesn't block any of this
// -- the leave button, confirmation dialog, and its actions all render and
// work regardless of live-audio connection state.
test.beforeEach(async ({ page }) => {
  await mockApi(page, "/api/consent/status", { currentVersion: 1, canEnableMic: true });
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
  await mockApi(
    page,
    `/api/rooms/${ROOM_ID}/leave`,
    {
      evaluation: {
        jobId: "job-1",
        status: "running",
        finality: "pending",
        accepted: true,
        disposition: "accepted",
      },
    },
    { method: "POST", status: 202 },
  );
  await mockApi(page, `/api/rooms/${ROOM_ID}/leave/evaluation`, {
    evaluation: {
      jobId: "job-1",
      status: "running",
      finality: "pending",
      accepted: true,
      disposition: "already_accepted",
    },
  });
  // Leave now lands on the ended/report screen (not the lobby -- see below),
  // which polls these on mount.
  await mockApi(page, `/api/rooms/${ROOM_ID}/feedback/mine`, { feedback: null });
  await mockApi(page, `/api/rooms/${ROOM_ID}/transcript`, { lines: [] });
});

test("clicking Leave shows a confirmation instead of leaving immediately", async ({ page }) => {
  await gotoReady(page, `/session/${ROOM_ID}`);

  await page.getByRole("button", { name: "Leave" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Leave the discussion?")).toBeVisible();
  await expect(
    dialog.getByText("We'll try to generate feedback from what was captured before you leave."),
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

test("confirming Leave navigates to the ended/report screen, not back into the live session", async ({
  page,
}) => {
  await gotoReady(page, `/session/${ROOM_ID}`);
  await page.getByRole("button", { name: "Leave" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Leave" }).click();

  await expect(page).toHaveURL(new RegExp(`/ended/${ROOM_ID}`));
  await expect(page.getByText("Your early-leave evaluation is pending.")).toBeVisible();
});

test("an unaccepted leave evaluation is honest and retryable after exit", async ({ page }) => {
  await mockApi(
    page,
    `/api/rooms/${ROOM_ID}/leave`,
    { error: "Early-leave evaluation is temporarily unavailable" },
    { method: "POST", status: 503 },
  );
  await mockApi(page, `/api/rooms/${ROOM_ID}/leave/evaluation`, { evaluation: null });
  await gotoReady(page, `/session/${ROOM_ID}`);
  await page.getByRole("button", { name: "Leave" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Leave" }).click();

  await expect(page).toHaveURL(new RegExp(`/ended/${ROOM_ID}`));
  await expect(page.getByText("We couldn't start your early-leave evaluation.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry evaluation" })).toBeVisible();
});

test("a flush timeout is labelled as partial", async ({ page }) => {
  await mockApi(page, `/api/rooms/${ROOM_ID}/leave/evaluation`, {
    evaluation: {
      jobId: "job-1",
      status: "partial",
      finality: "timed_out_partial",
      accepted: true,
      disposition: "already_accepted",
    },
  });
  await gotoReady(page, `/session/${ROOM_ID}`);
  await page.getByRole("button", { name: "Leave" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Leave" }).click();

  await expect(page.getByText("Feedback uses a partial transcript")).toBeVisible();
});
