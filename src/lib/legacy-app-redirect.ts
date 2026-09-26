// Redirects for the parked `/app/*` native-shell URLs (SCRUM-82).
//
// Those routes were live on the production domain before being moved to the
// `native-parked` branch, so old bookmarks/links would otherwise land on the
// 404 page. Each maps to its one web equivalent; the flat room screens
// carried the room in a `roomId` search param, which moves into the path.
//
// Exports:
// - legacyAppRedirect: the web URL for a legacy /app path, or null when the
//   path isn't one.

const STATIC: Record<string, string> = {
  login: "/login",
  signup: "/signup",
  consent: "/consent",
  account: "/account",
  history: "/history",
  join: "/join",
  match: "/match",
  new: "/rooms/new",
};

const ROOM_SCREENS = new Set(["lobby", "session", "ended"]);

export function legacyAppRedirect(
  pathname: string,
  search: Record<string, unknown>,
): string | null {
  const match = /^\/app(?:\/(.*))?$/.exec(pathname);
  if (!match) return null;

  const screen = (match[1] ?? "").replace(/\/+$/, "");
  if (screen === "") return "/";

  const staticTarget = STATIC[screen];
  if (staticTarget) return staticTarget;

  if (ROOM_SCREENS.has(screen)) {
    const roomId = search["roomId"];
    if (typeof roomId !== "string" || roomId === "") return "/join";
    return `/${screen}/${encodeURIComponent(roomId)}`;
  }

  return "/";
}
