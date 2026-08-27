import { expect, test } from "@playwright/test";

import { gotoReady, mockApi } from "./mocks";

const ROOM_ID = "room-1";

test.beforeEach(async ({ page }) => {
  await mockApi(page, "/api/consent/status", { currentVersion: 1, canEnableMic: true });
  await mockApi(page, `/api/rooms/${ROOM_ID}/status`, {
    id: ROOM_ID,
    status: "ended",
    code: "GD-1234",
    topicText: "Is AI making engineers less employable?",
    durationSeconds: 900,
    isCreator: true,
  });
  await mockApi(page, `/api/rooms/${ROOM_ID}/transcript`, {
    lines: [{ userId: "u1", displayName: "Aarav Menon", text: "Opening framing.", startedAtMs: 0 }],
  });
  await mockApi(page, `/api/rooms/${ROOM_ID}/participants`, {
    participants: [{ userId: "u1", displayName: "Aarav Menon", talkShare: 26 }],
  });
});

test("shows the score, feedback text, and a dimension-driven next-topic suggestion", async ({
  page,
}) => {
  await mockApi(page, `/api/rooms/${ROOM_ID}/feedback/mine`, {
    feedback: "Strong framing, but filler words held back your fluency score.",
    score: 74,
    dimensions: [
      { label: "Content depth", score: 86, note: "Backed claims with data." },
      { label: "Fluency", score: 55, note: "18 filler words detected." },
    ],
    strengths: ["Opened with a crisp framing."],
    improvements: ["Cut filler words."],
  });

  await gotoReady(page, `/ended/${ROOM_ID}`);

  await expect(
    page.getByText("Strong framing, but filler words held back your fluency score."),
  ).toBeVisible();
  await expect(page.getByText("74", { exact: true })).toBeVisible();
  await expect(page.getByText("Content depth", { exact: true })).toBeVisible();
  await expect(page.getByText("Fluency", { exact: true })).toBeVisible();
  await expect(page.getByText("Opened with a crisp framing.")).toBeVisible();
  // Suggested-next-topic targets the real lowest-scoring dimension
  // (Fluency, 55) -- not a hardcoded fixture -- see the
  // weakestDimension() helper this exercises.
  await expect(page.getByText(/targets your lowest sub-score: fluency \(55\)/i)).toBeVisible();
});

test("shows a pending state before feedback has arrived", async ({ page }) => {
  await mockApi(page, `/api/rooms/${ROOM_ID}/feedback/mine`, { feedback: null });

  await gotoReady(page, `/ended/${ROOM_ID}`);

  await expect(page.getByText("Generating your feedback…")).toBeVisible();
});

test("lets the student rate the feedback as useful", async ({ page }) => {
  await mockApi(page, `/api/rooms/${ROOM_ID}/feedback/mine`, {
    feedback: "Solid session overall.",
    score: 80,
    dimensions: [{ label: "Clarity", score: 80, note: "Clear throughout." }],
    strengths: [],
    improvements: [],
  });
  let ratedTrue = false;
  await page.route(`**/api/rooms/${ROOM_ID}/feedback/mine/rating`, (route) => {
    const body = route.request().postDataJSON() as { rating: boolean };
    ratedTrue = body.rating === true;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rating: body.rating, ratingReason: null }),
    });
  });

  await gotoReady(page, `/ended/${ROOM_ID}`);
  const helpful = page.getByRole("button", { name: "Feedback was useful" });
  await helpful.click();

  await expect(helpful).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => ratedTrue).toBe(true);
});
