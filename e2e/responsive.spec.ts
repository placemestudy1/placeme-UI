import { expect, test, type Page } from "@playwright/test";

import { gotoReady, mockApi } from "./mocks";

// SCRUM-82: v1 is mobile-responsive web only -- the parallel `/app/*`
// native-shell routes were parked, so every web route has to work on its
// own at a small phone width. 360px is the narrowest common Android
// viewport. "Works" here means: the real page renders (not the auth/consent
// loading gate or an error screen) and nothing forces horizontal scrolling.

const ROOM_ID = "room-1";
const MOBILE = { width: 360, height: 740 };
// Long enough to wrap several times at 360px -- the realistic worst case
// for the topic headings most screens render.
const TOPIC =
  "Should Indian engineering colleges replace campus placement drives with year-long industry apprenticeships?";

const consented = { currentVersion: 1, canEnableMic: true, ageAttested: true };

const roomStatus = (status: "waiting" | "live" | "ended") => ({
  id: ROOM_ID,
  status,
  code: "GD-1234",
  topicText: TOPIC,
  durationSeconds: 900,
  isCreator: true,
  ...(status === "live" ? { endsAt: Date.now() + 900_000 } : {}),
});

const participants = {
  participants: [
    { userId: "u1", displayName: "Aarav Menon", talkShare: 38 },
    { userId: "u2", displayName: "Ishita Venkataraman-Rao", talkShare: 34 },
    { userId: "u3", displayName: "Kabir Singh", talkShare: 28 },
  ],
};

const history = {
  sessions: [
    {
      id: "s1",
      code: "GD-1111",
      status: "ended",
      durationSeconds: 1200,
      topicText: TOPIC,
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
};

const openRooms = {
  rooms: [
    {
      id: "room-3",
      code: "GD-9999",
      topicText: TOPIC,
      durationSeconds: 900,
      maxParticipants: 6,
      participantCount: 3,
      hostDisplayName: "Ishita Venkataraman-Rao",
      createdAt: new Date().toISOString(),
    },
  ],
};

async function mockRoom(page: Page, status: "waiting" | "live" | "ended") {
  await mockApi(page, `/api/rooms/${ROOM_ID}/status`, roomStatus(status));
  await mockApi(page, `/api/rooms/${ROOM_ID}/participants`, participants);
}

interface RouteCase {
  path: string;
  title: string | RegExp;
  signedIn?: boolean;
  mock?: (page: Page) => Promise<void>;
}

const routes: RouteCase[] = [
  {
    path: "/",
    title: /^Home · PlaceMe/,
    mock: async (page) => {
      await mockApi(page, "/api/history/mine", history);
      await mockApi(page, "/api/rooms/open", openRooms);
    },
  },
  { path: "/login", title: "Log in · PlaceMe", signedIn: false },
  { path: "/signup", title: "Sign up · PlaceMe", signedIn: false },
  {
    path: "/consent",
    title: "Microphone access · PlaceMe",
    // Not yet consented, so the full disclosure list + grant form renders.
    mock: (page) =>
      mockApi(page, "/api/consent/status", {
        currentVersion: 1,
        canEnableMic: false,
        ageAttested: false,
      }),
  },
  { path: "/account", title: "Privacy & your data · PlaceMe" },
  {
    path: "/history",
    title: "History · PlaceMe",
    mock: (page) => mockApi(page, "/api/history/mine", history),
  },
  {
    path: "/join",
    title: "Join a room · PlaceMe",
    mock: (page) => mockApi(page, "/api/rooms/open", openRooms),
  },
  { path: "/rooms/new", title: "Create a room · PlaceMe" },
  { path: "/match", title: "Random match · PlaceMe" },
  {
    path: `/lobby/${ROOM_ID}`,
    title: "Room lobby · PlaceMe",
    mock: (page) => mockRoom(page, "waiting"),
  },
  {
    path: `/session/${ROOM_ID}`,
    title: "Live session · PlaceMe",
    // The LiveKit connection itself isn't mocked (same as
    // session-exit.spec.ts) -- its connection-error banner is part of what
    // has to fit at 360px too.
    mock: async (page) => {
      await mockRoom(page, "live");
      await mockApi(page, `/api/rooms/${ROOM_ID}/token`, {
        token: "fake-livekit-token",
        url: "wss://mock.livekit.test",
        identity: "u1",
        roomName: ROOM_ID,
      });
    },
  },
  {
    path: `/ended/${ROOM_ID}`,
    title: "Session feedback · PlaceMe",
    mock: async (page) => {
      await mockRoom(page, "ended");
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
      await mockApi(page, `/api/rooms/${ROOM_ID}/transcript`, {
        lines: [
          { userId: "u1", displayName: "Aarav Menon", text: "Opening framing.", startedAtMs: 0 },
        ],
      });
    },
  },
  { path: "/privacy", title: "Privacy Policy · PlaceMe", signedIn: false },
  { path: "/terms", title: "Terms of Service · PlaceMe", signedIn: false },
  { path: "/no-such-page", title: "Page not found · PlaceMe", signedIn: false },
];

// Describes every visible element whose box extends past the viewport's
// right edge -- empty when nothing overflows. Elements inside their own
// horizontal scroll/clip container (e.g. a deliberately scrollable chip
// row) are fine: they don't make the page itself scroll sideways.
function findHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const offenders: string[] = [];
    const clipsX = (el: Element) =>
      ["auto", "scroll", "hidden", "clip"].includes(getComputedStyle(el).overflowX);
    const insideClipper = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (clipsX(p)) return true;
      }
      return false;
    };
    for (const el of document.body.querySelectorAll("*")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= viewport + 1) continue;
      if (insideClipper(el)) continue;
      const cls = typeof el.className === "string" ? el.className.slice(0, 80) : "";
      const text = (el.textContent ?? "").trim().slice(0, 40);
      offenders.push(
        `<${el.tagName.toLowerCase()} class="${cls}"> right=${Math.round(rect.right)} "${text}"`,
      );
    }
    return {
      viewport,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: offenders.slice(0, 8),
    };
  });
}

test.describe("every web route works at 360px", () => {
  test.use({ viewport: MOBILE, hasTouch: true, isMobile: true });

  for (const route of routes) {
    test.describe(route.path, () => {
      if (route.signedIn === false) {
        test.use({ storageState: { cookies: [], origins: [] } });
      }

      test("renders without horizontal overflow", async ({ page }) => {
        await mockApi(page, "/api/consent/status", consented);
        // Registered after the default, so a route's own mocks win.
        await route.mock?.(page);

        await gotoReady(page, route.path);

        await expect(page).toHaveTitle(route.title);
        // The real page rendered, not ProtectedRoute's loading gates.
        await expect(page.getByText("Checking your session…")).toHaveCount(0);
        await expect(page.getByText(/checking your consent status/i)).toHaveCount(0);

        const overflow = await findHorizontalOverflow(page);
        expect(overflow.offenders, `elements wider than ${overflow.viewport}px`).toEqual([]);
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.viewport);
      });
    });
  }
});
