// Shared participant helper for deriving display initials.
//
// Exports:
// - initialsFor: builds up to two initials from a display name.

/**
 * Derives up to two-letter initials from a participant's display name.
 * E.g. "Jane Doe" → "JD", used for avatar tiles.
 */
export function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
