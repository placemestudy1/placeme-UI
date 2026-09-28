import { expect, test, type Page } from "@playwright/test";

import { gotoReady, mockApi, mockFeatureFlags } from "./mocks";

// SPEC-0017 AC8: a full MCQ attempt in a real browser -- pick a test,
// answer, reload mid-test (resume), submit, and read the results. The
// question bundle (Supabase Storage) and the three MCQ endpoints are mocked.

const TEST_ID = "f7ff1cd0-d220-5d23-9c89-ff546ad0acfc";
const ATTEMPT_ID = "9b2f7c1e-1111-4222-8333-444455556666";
const Q1 = "00000000-0000-4000-8000-000000000001";
const Q2 = "00000000-0000-4000-8000-000000000002";
const Q3 = "00000000-0000-4000-8000-000000000003";

const bundle = {
  version: "v1",
  questions: [
    {
      id: Q1,
      section: "aptitude",
      topic: "quant",
      difficulty: 1,
      stem: "What is 25% of 400?",
      options: ["50", "75", "100", "125"],
    },
    {
      id: Q2,
      section: "aptitude",
      topic: "logical",
      difficulty: 2,
      stem: "Next in 2, 4, 8, 16?",
      options: ["18", "24", "32", "30"],
    },
    {
      id: Q3,
      section: "technical",
      topic: "os",
      difficulty: 2,
      stem: "Which schedules processes?",
      options: ["Compiler", "Kernel", "Linker", "Shell"],
    },
  ],
  tests: [
    {
      id: TEST_ID,
      name: "Mixed practice",
      sectionMix: { aptitude: 2, technical: 1 },
      questionCount: 3,
      durationSeconds: 1800,
    },
  ],
};

async function mockBank(page: Page) {
  await page.route("**/storage/v1/object/public/mcq-bank/current.json", (route) =>
    route.fulfill({ json: { version: "v1", bundlePath: "bank-v1.json", questionCount: 3 } }),
  );
  await page.route("**/storage/v1/object/public/mcq-bank/bank-v1.json", (route) =>
    route.fulfill({ json: bundle }),
  );
}

test.beforeEach(async ({ page }) => {
  await mockFeatureFlags(page, { mcq: true });
  await mockApi(page, "/api/consent/status", {
    currentVersion: 1,
    canEnableMic: true,
    ageAttested: true,
  });
  await mockBank(page);
});

test("takes a practice test end to end: start, answer, resume after reload, submit, results", async ({
  page,
}) => {
  const now = new Date();
  await mockApi(
    page,
    `/api/mcq/tests/${TEST_ID}/attempts`,
    {
      attemptId: ATTEMPT_ID,
      testId: TEST_ID,
      questionIds: [Q1, Q2, Q3],
      bankVersion: "v1",
      startedAt: now.toISOString(),
      endAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
      now: now.toISOString(),
      answers: {},
      checkpointSeq: 0,
    },
    { method: "POST" },
  );
  let submitted: unknown = null;
  await page.route(`**/api/mcq/attempts/${ATTEMPT_ID}/submit`, async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      json: {
        attemptId: ATTEMPT_ID,
        score: 2,
        sectionScores: { aptitude: { correct: 1, total: 2 }, technical: { correct: 1, total: 1 } },
        submitReason: "student",
        submittedAt: new Date().toISOString(),
        keys: [
          { questionId: Q1, correctIndex: 2, explanation: "25% of 400 = 100" },
          { questionId: Q2, correctIndex: 2, explanation: "Each term doubles." },
          { questionId: Q3, correctIndex: 1, explanation: "The kernel schedules processes." },
        ],
      },
    });
  });

  // Picker
  await gotoReady(page, "/mcq");
  await expect(page.getByRole("heading", { name: "Mixed practice" })).toBeVisible();
  await page.getByRole("button", { name: "Start test" }).click();

  // Q1: pick C (100) by clicking
  await expect(page).toHaveURL(new RegExp(`/mcq/${ATTEMPT_ID}$`));
  await expect(page.getByText("What is 25% of 400?")).toBeVisible();
  await page.getByText("100", { exact: true }).click();
  await expect(page.getByText("Answered", { exact: true })).toBeVisible();

  // Q2: keyboard -- next, pick A (wrong on purpose), flag
  await page.keyboard.press("n");
  await expect(page.getByText("Next in 2, 4, 8, 16?")).toBeVisible();
  await page.keyboard.press("1");
  await page.keyboard.press("f");

  // Reload mid-test: answers, flag and position come back from local storage
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("Next in 2, 4, 8, 16?")).toBeVisible();
  await expect(page.getByRole("radio", { name: /18/ })).toBeChecked();
  await page.keyboard.press("p");
  await expect(page.getByRole("radio", { name: /100/ })).toBeChecked();

  // Technical section tab, answer Q3, then finish
  await page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("button", { name: /Technical/ })
    .click();
  await expect(page.getByText("Which schedules processes?")).toBeVisible();
  await page.getByText("Kernel", { exact: true }).click();
  await page.getByRole("button", { name: "Finish test" }).click();
  await expect(page.getByRole("dialog").filter({ hasText: "Finish this test?" })).toBeVisible();
  await page.getByRole("button", { name: "Submit test" }).click();

  // Results
  await expect(page).toHaveURL(new RegExp(`/mcq/results/${ATTEMPT_ID}$`));
  await expect(page.getByText("2 / 3 correct")).toBeVisible();
  await expect(page.getByText("The kernel schedules processes.")).toBeVisible();
  await page.getByRole("button", { name: "Incorrect" }).click();
  await expect(page.getByText("Next in 2, 4, 8, 16?")).toBeVisible();
  await expect(page.getByText("What is 25% of 400?")).toHaveCount(0);

  // The submit carried every answer, with the flag and time spent
  const answers = (submitted as { answers: Record<string, { c: number; t: number; r: boolean }> })
    .answers;
  expect(answers[Q1]?.c).toBe(2);
  expect(answers[Q2]).toMatchObject({ c: 0, r: true });
  expect(answers[Q3]?.c).toBe(1);
});

test("shows a clear message when practice tests aren't published yet", async ({ page }) => {
  await page.unroute("**/storage/v1/object/public/mcq-bank/current.json");
  await page.route("**/storage/v1/object/public/mcq-bank/current.json", (route) =>
    route.fulfill({ status: 400, json: {} }),
  );
  await gotoReady(page, "/mcq");
  await expect(page.getByText(/Couldn't load practice tests/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("warns at 1:00 and 0:30, turns red at 0:10, and auto-submits at 0:00 without a dialog", async ({
  page,
}) => {
  // Real "now", so the stored test session isn't seen as expired.
  const start = new Date();
  await page.clock.install({ time: start });
  await mockApi(
    page,
    `/api/mcq/tests/${TEST_ID}/attempts`,
    {
      attemptId: ATTEMPT_ID,
      testId: TEST_ID,
      questionIds: [Q1, Q2, Q3],
      bankVersion: "v1",
      startedAt: start.toISOString(),
      endAt: new Date(start.getTime() + 75_000).toISOString(),
      now: start.toISOString(),
      answers: {},
      checkpointSeq: 0,
    },
    { method: "POST" },
  );
  await page.route(`**/api/mcq/attempts/${ATTEMPT_ID}/checkpoint`, (route) =>
    route.fulfill({ json: { status: "ok" } }),
  );
  let submitCalls = 0;
  await page.route(`**/api/mcq/attempts/${ATTEMPT_ID}/submit`, async (route) => {
    submitCalls += 1;
    await route.fulfill({
      json: {
        attemptId: ATTEMPT_ID,
        score: 1,
        sectionScores: {},
        submitReason: "student",
        submittedAt: new Date().toISOString(),
        keys: [
          { questionId: Q1, correctIndex: 2, explanation: null },
          { questionId: Q2, correctIndex: 2, explanation: null },
          { questionId: Q3, correctIndex: 1, explanation: null },
        ],
      },
    });
  });

  await gotoReady(page, "/mcq");
  await page.getByRole("button", { name: "Start test" }).click();
  await expect(page.getByText("What is 25% of 400?")).toBeVisible();
  await page.getByText("100", { exact: true }).click();
  const timer = page.getByRole("timer", { name: "Time remaining" });
  const alert = page.getByRole("alert").filter({ hasText: /remaining|Time is up/ });

  // 1:15 → 0:59: the 1-minute warning, timer amber
  await page.clock.runFor(16_000);
  await expect(alert).toContainText("1 minute remaining");
  await expect(timer).toHaveClass(/text-warning/);

  // → 0:29: the 30-second warning
  await page.clock.runFor(30_000);
  await expect(alert).toContainText("30 seconds remaining");

  // → 0:09: red. Leave the Finish dialog open to prove the timeout closes it.
  await page.clock.runFor(20_000);
  await expect(timer).toHaveClass(/text-destructive/);
  await page.getByRole("button", { name: "Finish test" }).click();
  await expect(page.getByRole("dialog").filter({ hasText: "Finish this test?" })).toBeVisible();

  // → 0:00: submits by itself, dialog gone, lands on results
  await page.clock.runFor(10_000);
  await expect(page).toHaveURL(new RegExp(`/mcq/results/${ATTEMPT_ID}$`));
  await expect(page.getByText("1 / 3 correct")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(submitCalls).toBe(1);
});

test("with the mcq flag off, the pages 404 and the nav has no Tests entry (AC11)", async ({
  page,
}) => {
  await page.unroute("**/rest/v1/feature_flags*");
  await mockFeatureFlags(page, { mcq: false });
  await gotoReady(page, "/mcq");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await gotoReady(page, "/history");
  await expect(page.getByRole("link", { name: "History" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Tests" })).toHaveCount(0);
});

test("with the mcq flag on, the nav links to the tests", async ({ page }) => {
  await gotoReady(page, "/mcq");
  await expect(page.getByRole("link", { name: "Tests" }).first()).toHaveAttribute("href", "/mcq");
});
