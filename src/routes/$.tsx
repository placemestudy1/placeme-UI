/**
 * Catch-all 404 screen for the web app — shown when a URL doesn't match any
 * route, or a room code has expired.
 *
 * - NotFoundPage(): main route component — renders the 404 message with
 *   links back home or to join a room.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { EmptyState, PmButton } from "@/components/pm/kit";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Page not found · PlaceMe" },
      { name: "description", content: "This PlaceMe page doesn't exist or the room code expired." },
      { property: "og:title", content: "Page not found · PlaceMe" },
      { property: "og:description", content: "The page or room you're looking for is gone." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotFoundPage,
});

// Main 404 page: tells the visitor the page/room doesn't exist (or its code
// expired) and offers links back home or to join with a code.
function NotFoundPage() {
  return (
    <WebShell>
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="font-display text-7xl font-bold text-gradient">404</p>
        <div className="mt-8">
          <EmptyState
            icon={<Compass />}
            title="This room doesn't exist"
            description="The page moved, or the room code expired 15 minutes after its session ended."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <PmButton asChild>
                  <Link to="/">Go home</Link>
                </PmButton>
                <PmButton asChild variant="outline">
                  <Link to="/join">Join with a code</Link>
                </PmButton>
              </div>
            }
          />
        </div>
      </div>
    </WebShell>
  );
}
