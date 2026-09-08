import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CloudOff, History, Mic, Sparkles, Users } from "lucide-react";

// The real, current-state consent disclosures shown on both the web and
// native consent pages (SPEC-0012 R2/AC2). Mirrors gd-proto's
// apps/web/src/pages/ConsentPage.jsx DISCLOSURES pattern rather than
// inventing a new format -- same required content, just rendered with
// lucide icons instead of Material Symbols strings. Don't trim any entry
// without updating SPEC-0012 and bumping CURRENT_CONSENT_VERSION server-side.
export interface ConsentDisclosure {
  icon: LucideIcon;
  title: string;
  body: string;
}

export const CONSENT_DISCLOSURES: ConsentDisclosure[] = [
  {
    icon: Mic,
    title: "Microphone capture",
    body: "When you join a GD room, your microphone audio is captured live so it can be transcribed and so the other participants can hear you.",
  },
  {
    icon: CloudOff,
    title: "Raw audio is never stored",
    body: "Your audio is streamed directly to our transcription service and is never saved to a disk or database -- it exists only for the moment it takes to convert your speech to text.",
  },
  {
    icon: History,
    title: "Transcript and feedback retention",
    body: "Your transcript and feedback are kept until you delete your account.",
  },
  {
    icon: Users,
    title: "Peer visibility, during beta",
    body: "You can see your own session transcript and feedback excerpts. Other participants cannot see yours, and you cannot see theirs -- own excerpts only during beta.",
  },
  {
    icon: Sparkles,
    title: "Feedback via Google's Gemini API (free tier)",
    body: "Under Gemini's free-tier terms, the transcript sent for feedback may be used by Google to improve their products, and may be reviewed by a human at Google. If you're not comfortable with this, please don't proceed until a paid-tier option is available.",
  },
  {
    icon: AlertTriangle,
    title: "Interim policy notice",
    body: "The processor, purpose, and retention details above are interim: they reflect our actual current practice, confirmed by an internal review, but formal legal review is still pending -- intentionally deferred during this early validation stage until any paid pilot or external commitment. See our Privacy Policy for the current version.",
  },
];
