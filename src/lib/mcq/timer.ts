/**
 * Countdown from the server-owned deadline (SPEC-0017). `serverOffsetMs`
 * (server clock minus client clock, measured at start) corrects a client
 * whose clock is wrong, so the timer matches what the server will accept.
 */
export function remainingSeconds(endAt: string, serverOffsetMs: number, clientNowMs = Date.now()) {
  const serverNow = clientNowMs + serverOffsetMs;
  return Math.max(0, Math.ceil((Date.parse(endAt) - serverNow) / 1000));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 125 → "02:05", 3725 → "01:02:05" */
export function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** 83000 → "1m 23s", 9000 → "9s" */
export function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Seconds-left marks that raise a warning, largest first. Modelled on NTA's
 * computer-based tests, which warn at 5 min, 3 min, 1 min and 30 s; 3 min is
 * left out as noise for 20-30 minute practice tests.
 */
export const TIME_WARNINGS = [300, 60, 30] as const;
export const DANGER_SECONDS = 10;

export type TimerTone = "normal" | "warning" | "danger";

/** Amber from the first warning (5:00), red from 0:10. */
export function timerTone(secondsLeft: number): TimerTone {
  if (secondsLeft <= DANGER_SECONDS) return "danger";
  if (secondsLeft <= TIME_WARNINGS[0]) return "warning";
  return "normal";
}

/**
 * The warning mark crossed going from `previous` to `current` seconds left,
 * or null. Only a live crossing counts: opening a test that already has 45s
 * left doesn't replay the 1:00 warning.
 */
export function crossedWarning(previous: number | null, current: number): number | null {
  if (previous === null) return null;
  // Smallest mark first: a throttled tab jumping past both shows the more
  // urgent one.
  for (const mark of [...TIME_WARNINGS].reverse()) {
    if (previous > mark && current <= mark) return mark;
  }
  return null;
}

/** 300 → "5 minutes remaining", 60 → "1 minute remaining", 30 → "30 seconds remaining" */
export function warningText(mark: number) {
  return mark >= 60 && mark % 60 === 0
    ? `${mark / 60} minute${mark === 60 ? "" : "s"} remaining`
    : `${mark} seconds remaining`;
}
