import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalLayout } from "@/components/pm/legal-layout";

// Real Privacy Policy page (SPEC-0012 R1/AC1), linked from signup and from
// the consent page instead of the previous inert "Terms and Privacy Policy"
// text. Public route -- reachable before signing up. Content mirrors the
// same disclosures shown on the consent page (see
// src/lib/consent-disclosures.ts) so the two never drift apart.
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · PlaceMe" },
      {
        name: "description",
        content: "What PlaceMe collects, keeps, and shares during the beta pilot.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <div>
        <h2 className="text-base font-semibold text-foreground">What we collect</h2>
        <p className="mt-2">
          Your name, college email, college, and graduating year at signup; a live transcript of
          your speech while you're in a group-discussion room; and the AI-generated feedback based
          on that transcript.
        </p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">Microphone audio</h2>
        <p className="mt-2">
          Your microphone audio is streamed live to our transcription service so it can be converted
          to text. Raw audio is never saved to a disk or database.
        </p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">How long we keep it</h2>
        <p className="mt-2">
          Your transcript and feedback are kept until you delete your account. You can request
          deletion at any time from the "Privacy &amp; your data" section of your account -- a
          founder processes the request manually, typically within 7 days.
        </p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">Who can see it</h2>
        <p className="mt-2">
          During beta, you can only see your own session transcript and feedback excerpts -- not
          other participants', and they can't see yours.
        </p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">Processing</h2>
        <p className="mt-2">
          Feedback is generated using Google's Gemini API on its free tier. Under Gemini's free-tier
          terms, the transcript sent for feedback may be used by Google to improve its products, and
          may be reviewed by a human at Google.
        </p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">Your rights</h2>
        <p className="mt-2">
          You can withdraw consent for future mic use at any time -- this does not delete your past
          consent record, transcript, or feedback. You can also request account deletion, which
          removes your account, transcript, and feedback via our manual deletion process. Both
          actions are available from the "Privacy &amp; your data" section of your account.
        </p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">Interim status</h2>
        <p className="mt-2">
          The processor, purpose, and retention details above reflect our actual current practice,
          but are still pending a full legal review of our data map (tracked internally as
          SCRUM-24). This page will be updated once that review completes.
        </p>
      </div>
      <p>
        See our{" "}
        <Link to="/terms" className="font-semibold text-primary-glow">
          Terms of Service
        </Link>{" "}
        for how these apply to your use of PlaceMe.
      </p>
    </LegalLayout>
  );
}
