/**
 * Catch-all 404 screen for the native/mobile app — shown when a mobile route
 * doesn't match, or a room is no longer waiting to start.
 *
 * - NativeNotFound(): main route component — renders the 404 message with a
 *   link to join another room.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";

import { NativeStackScreen } from "@/components/pm/native-shell";
import { EmptyState, PmButton } from "@/components/pm/kit";

export const Route = createFileRoute("/app/$")({
  head: () => ({
    meta: [
      { title: "Not found · PlaceMe Mobile" },
      { name: "description", content: "This mobile screen or room code no longer exists." },
      { property: "og:title", content: "Not found · PlaceMe Mobile" },
      { property: "og:description", content: "The screen you're looking for is gone." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NativeNotFound,
});

// Main 404 screen for the mobile app: tells the visitor the room is gone and
// offers a link to join another room.
function NativeNotFound() {
  return (
    <NativeStackScreen title="Not found" backTo="/app" backLabel="Home">
      <div className="px-5 py-14 text-center">
        <p className="font-display text-6xl font-bold text-gradient">404</p>
        <div className="mt-8">
          <EmptyState
            icon={<Compass />}
            title="This room is gone"
            description="A room code can join only a room that is still waiting to start."
            action={
              <PmButton asChild size="sm">
                <Link to="/app/join">Join another room</Link>
              </PmButton>
            }
          />
        </div>
      </div>
    </NativeStackScreen>
  );
}
