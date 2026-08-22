// Shared shape definitions and the one remaining fixture value still used by
// real, backend-wired screens. The mobile-app "native preview" screens that
// used to hold most of this file's fixture data (fake login, fake rooms,
// fake feedback, all presented in an iPhone-mockup shell) were removed
// entirely rather than migrated -- see ACTION_PLAN.md Phase 2.
//
// Exports:
// - Participant: a room participant's shape (avatar/mic-state/talk-share),
//   shared by ParticipantTile and the live-room LiveKit integration.
// - Room: a browsable/joinable room's shape, shared by RoomCard and the
//   real-data adapters in join.tsx/index.tsx (server OpenRoom -> Room).
// - Session: a past-session row's shape, shared by SessionRow and the real
//   HistorySession -> Session adapters in history.tsx/index.tsx.
// - topics: sample GD discussion prompts, still used as the curated-topic
//   dropdown options in rooms.new.tsx -- there's no backend "list curated
//   topics" endpoint (only generate/custom), so this is genuine content,
//   not a placeholder standing in for real data.

// A single participant in a discussion room.
export type Participant = {
  id: string;
  name: string;
  initials: string;
  college: string;
  speaking?: boolean;
  muted?: boolean;
  talkShare: number;
  role?: "Moderator" | "Participant";
  handRaised?: boolean;
};

export type Room = {
  code: string;
  topic: string;
  host: string;
  seats: number;
  filled: number;
  // Widened from a fixed "Beginner" | "Intermediate" | "Advanced" union so a
  // real room (no level field yet, see BE-4) can honestly say "Any level"
  // instead of fabricating one of the three tiers.
  level: string;
  startsIn: string;
  duration: string;
};

export type Session = {
  id: string;
  topic: string;
  date: string;
  duration: string;
  // Optional so SessionRow can also render real history rows, which don't
  // have a participant count (docs/BACKEND_REQUIREMENTS.md notes this as a
  // small history-endpoint gap) or a numeric score (BE-6/BE-7) yet.
  participants?: number;
  score?: number | undefined;
  code: string;
  status: "Analyzed" | "Processing";
};

// Sample GD discussion prompts used as rooms.new.tsx's curated topic list.
export const topics = [
  "Is AI making engineers less employable?",
  "Remote work vs. office culture for freshers",
  "Should India regulate gig-economy platforms?",
  "Open source as a hiring signal",
  "Startups vs. service companies for campus placements",
] as const;
