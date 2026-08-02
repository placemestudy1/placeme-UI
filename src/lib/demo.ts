// Fixture/demo data for the UI before it's wired to real backend endpoints.
// Used by screens that haven't been migrated to real API data yet, and as
// fallback defaults for components (e.g. ProgressChart's `series` prop) that
// now accept real data too.
//
// Exports:
// - Participant, currentUser, participants: a demo room's roster and the
//   signed-in "current" user shown in fixture screens.
// - topics: sample GD discussion prompts.
// - Room, liveRooms: sample open/live rooms for the browse-rooms screens.
// - TranscriptLine, transcript: a sample session transcript.
// - feedbackScores, feedbackStrengths, feedbackImprovements: sample
//   post-session feedback content.
// - Session, history: sample past-session rows for the history screen.
// - stats: sample profile/dashboard stat tiles.
// - progressSeries: sample score-over-time series (default data for
//   ProgressChart when a real `series` isn't passed in).

// A single participant in a discussion room (fixture data).
export type Participant = {
  id: string;
  name: string;
  initials: string;
  college: string;
  speaking?: boolean;
  muted?: boolean;
  talkShare: number;
  role?: "Moderator" | "Participant";
};

// Demo "signed-in" user shown on fixture-data screens.
export const currentUser = {
  name: "Aarav Menon",
  initials: "AM",
  email: "aarav.menon@nitk.edu.in",
  college: "NITK Surathkal · CSE '27",
  streak: 12,
};

// Sample roster for a demo discussion room.
export const participants: Participant[] = [
  {
    id: "p1",
    name: "Aarav Menon",
    initials: "AM",
    college: "NITK Surathkal",
    speaking: true,
    talkShare: 26,
    role: "Participant",
  },
  {
    id: "p2",
    name: "Ishita Rao",
    initials: "IR",
    college: "VIT Vellore",
    talkShare: 22,
    role: "Moderator",
  },
  { id: "p3", name: "Karan Bhatia", initials: "KB", college: "IIIT Hyderabad", talkShare: 19 },
  { id: "p4", name: "Meera Nair", initials: "MN", college: "BITS Pilani", talkShare: 17 },
  { id: "p5", name: "Rohit Sen", initials: "RS", college: "DTU Delhi", muted: true, talkShare: 9 },
  {
    id: "p6",
    name: "Sana Qureshi",
    initials: "SQ",
    college: "COEP Pune",
    muted: true,
    talkShare: 7,
  },
];

// Sample GD discussion prompts used across fixture screens.
export const topics = [
  "Is AI making engineers less employable?",
  "Remote work vs. office culture for freshers",
  "Should India regulate gig-economy platforms?",
  "Open source as a hiring signal",
  "Startups vs. service companies for campus placements",
] as const;

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

// Sample open/live rooms for the browse-rooms screens.
export const liveRooms: Room[] = [
  {
    code: "GD-4821",
    topic: topics[0],
    host: "Ishita Rao",
    seats: 8,
    filled: 6,
    level: "Intermediate",
    startsIn: "Starting in 2m",
    duration: "20 min",
  },
  {
    code: "GD-9075",
    topic: topics[2],
    host: "Karan Bhatia",
    seats: 6,
    filled: 3,
    level: "Advanced",
    startsIn: "Live now",
    duration: "25 min",
  },
  {
    code: "GD-1136",
    topic: topics[1],
    host: "Meera Nair",
    seats: 10,
    filled: 9,
    level: "Beginner",
    startsIn: "Starting in 11m",
    duration: "15 min",
  },
  {
    code: "GD-7742",
    topic: topics[4],
    host: "Rohit Sen",
    seats: 8,
    filled: 4,
    level: "Intermediate",
    startsIn: "Starting in 18m",
    duration: "20 min",
  },
];

export type TranscriptLine = {
  id: string;
  speaker: string;
  initials: string;
  time: string;
  text: string;
  tag?: "Strong point" | "Interruption" | "Filler words";
};

// Sample session transcript with strong-point/interruption/filler-word tags.
export const transcript: TranscriptLine[] = [
  {
    id: "t1",
    speaker: "Ishita Rao",
    initials: "IR",
    time: "00:12",
    text: "Let's frame the discussion: does AI reduce entry-level engineering roles, or does it shift what we're hired for?",
  },
  {
    id: "t2",
    speaker: "Aarav Menon",
    initials: "AM",
    time: "00:41",
    text: "I'd argue it shifts the bar. Code generation removes boilerplate, so judgement, system design and debugging become the differentiators.",
    tag: "Strong point",
  },
  {
    id: "t3",
    speaker: "Karan Bhatia",
    initials: "KB",
    time: "01:05",
    text: "But hiring data from 2025 shows a 14% dip in junior openings across service companies — that's a real signal, not just a shift.",
  },
  {
    id: "t4",
    speaker: "Aarav Menon",
    initials: "AM",
    time: "01:22",
    text: "Um, yeah, so, I think that dip is also, you know, tied to the funding cycle rather than AI alone.",
    tag: "Filler words",
  },
  {
    id: "t5",
    speaker: "Meera Nair",
    initials: "MN",
    time: "01:58",
    text: "Adding to Karan — the roles didn't disappear, the titles changed. Support engineering became platform engineering in most postings.",
  },
  {
    id: "t6",
    speaker: "Rohit Sen",
    initials: "RS",
    time: "02:20",
    text: "Sorry to cut in, but can we quantify how many of those postings actually require AI tooling experience?",
    tag: "Interruption",
  },
  {
    id: "t7",
    speaker: "Aarav Menon",
    initials: "AM",
    time: "02:44",
    text: "Roughly a third mention it explicitly. So the practical takeaway for us: pair fundamentals with demonstrable AI-assisted delivery.",
    tag: "Strong point",
  },
];

// Sample per-dimension feedback scores shown on the feedback screen.
export const feedbackScores = [
  { label: "Content depth", score: 86, note: "Backed claims with concrete 2025 hiring data." },
  { label: "Clarity", score: 78, note: "Clear structure, occasional long sentences." },
  { label: "Confidence", score: 81, note: "Steady tone; volume dropped when challenged." },
  { label: "Listening", score: 74, note: "Built on Meera's point, missed Sana twice." },
  { label: "Fluency", score: 69, note: "18 filler words detected across 8 minutes." },
];

// Sample list of feedback "strengths" bullets.
export const feedbackStrengths = [
  "Opened with a crisp framing that the group reused for the rest of the session.",
  "Used two verifiable data points instead of generic opinion.",
  "Closed with an actionable takeaway — evaluators score this highly.",
];

// Sample list of feedback "areas to improve" bullets.
export const feedbackImprovements = [
  'Reduce filler words ("um", "you know") — 18 detected, target under 8.',
  "Invite quieter participants in; Sana spoke for only 7% of the session.",
  "Avoid re-stating a point you already made at 01:22 and 02:44.",
];

export type Session = {
  id: string;
  topic: string;
  date: string;
  duration: string;
  // Optional so SessionRow can also render real history rows, which don't
  // have a participant count (docs/BACKEND_REQUIREMENTS.md notes this as a
  // small history-endpoint gap) or a numeric score (BE-6/BE-7) yet.
  participants?: number;
  score?: number;
  code: string;
  status: "Analyzed" | "Processing";
};

// Sample past-session rows for the history screen.
export const history: Session[] = [
  {
    id: "s1",
    topic: topics[0],
    date: "Jul 30, 2026 · 6:30 PM",
    duration: "22 min",
    participants: 6,
    score: 78,
    code: "GD-4821",
    status: "Analyzed",
  },
  {
    id: "s2",
    topic: topics[3],
    date: "Jul 27, 2026 · 8:05 PM",
    duration: "18 min",
    participants: 5,
    score: 72,
    code: "GD-3390",
    status: "Analyzed",
  },
  {
    id: "s3",
    topic: topics[2],
    date: "Jul 24, 2026 · 7:15 PM",
    duration: "25 min",
    participants: 8,
    score: 69,
    code: "GD-2214",
    status: "Analyzed",
  },
  {
    id: "s4",
    topic: topics[1],
    date: "Jul 21, 2026 · 9:00 PM",
    duration: "15 min",
    participants: 6,
    score: 64,
    code: "GD-1902",
    status: "Analyzed",
  },
  {
    id: "s5",
    topic: topics[4],
    date: "Jul 18, 2026 · 6:45 PM",
    duration: "20 min",
    participants: 7,
    score: 61,
    code: "GD-1770",
    status: "Processing",
  },
];

// Sample profile/dashboard stat tiles (sessions count, avg score, etc.).
export const stats = [
  { label: "Sessions", value: "24", delta: "+4 this week" },
  { label: "Avg. score", value: "74", delta: "+6 vs last month" },
  { label: "Speak time", value: "23%", delta: "Balanced" },
  { label: "Streak", value: "12 days", delta: "Personal best" },
];

// Sample week-over-week score series; the default `series` for ProgressChart
// when a caller hasn't wired it up to real history data (see BE-8 above).
export const progressSeries = [
  { label: "Wk 1", score: 58 },
  { label: "Wk 2", score: 63 },
  { label: "Wk 3", score: 61 },
  { label: "Wk 4", score: 70 },
  { label: "Wk 5", score: 74 },
  { label: "Wk 6", score: 78 },
];
