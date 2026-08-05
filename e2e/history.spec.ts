import { expect, test } from "@playwright/test";

import { gotoReady, mockApi } from "./mocks";

test("shows aggregate stats, monthly grouping, and each session's score", async ({ page }) => {
  await mockApi(page, "/api/history/mine", {
    sessions: [
      {
        id: "s1",
        code: "GD-1111",
        status: "ended",
        durationSeconds: 1200,
        topicText: "Is AI making engineers less employable?",
        startedAt: "2026-07-01T10:00:00.000Z",
        endedAt: "2026-07-01T10:20:00.000Z",
        feedback: "Great job.",
        score: 78,
        talkShare: 26,
      },
      {
        id: "s2",
        code: "GD-2222",
        status: "ended",
        durationSeconds: 900,
        topicText: "Remote work vs. office culture for freshers",
        startedAt: "2026-07-03T10:00:00.000Z",
        endedAt: "2026-07-03T10:15:00.000Z",
        feedback: "Nice work.",
        score: 64,
        talkShare: 18,
      },
    ],
  });

  await gotoReady(page, "/history");

  // WebShell renders its title/subtitle twice (desktop + mobile headers,
  // both present in the DOM at once) -- .first() is enough to confirm it's there.
  await expect(page.getByText("2 sessions · 35m of speaking practice").first()).toBeVisible();

  // avg score = round((78+64)/2) = 71, avg speak time = round((26+18)/2) = 22%
  await expect(page.getByText("71", { exact: true })).toBeVisible();
  await expect(page.getByText("22%", { exact: true })).toBeVisible();

  await expect(page.getByText("July 2026")).toBeVisible();
  // Each topic also appears a second time in the "Most practiced" aside,
  // not just the session row -- .first() confirms the row rendered.
  await expect(page.getByText("Is AI making engineers less employable?").first()).toBeVisible();
  await expect(page.getByText("Remote work vs. office culture for freshers").first()).toBeVisible();
  await expect(page.getByText("78", { exact: true })).toBeVisible();
  await expect(page.getByText("64", { exact: true })).toBeVisible();
});

test("shows an empty state with no past sessions", async ({ page }) => {
  await mockApi(page, "/api/history/mine", { sessions: [] });

  await gotoReady(page, "/history");

  await expect(page.getByText("No sessions yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start a session" })).toBeVisible();
});
