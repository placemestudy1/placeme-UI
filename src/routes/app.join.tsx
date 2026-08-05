/**
 * Renders the PlaceMe mobile app's join screen: a room-code entry card and a
 * searchable list of open live rooms a student can tap into — both wired to
 * the real backend.
 *
 * - NativeJoin(): main route component; renders the mobile join screen.
 * - onSubmit(): joins the entered room code via the API and navigates into
 *   its lobby.
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  CardSkeleton,
  EmptyState,
  PmButton,
  PmCard,
  PmInput,
  PmDialog,
  Field,
  PmSelect,
} from "@/components/pm/kit";
import { RoomCard } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { joinRoomByCode, listOpenRooms, type OpenRoom } from "@/lib/api";
import { toRoomCard } from "@/lib/session/rooms";

export const Route = createFileRoute("/app/join")({
  head: () => ({
    meta: [
      { title: "Join · PlaceMe Mobile" },
      { name: "description", content: "Enter a room code or browse open GD rooms on mobile." },
      { property: "og:title", content: "Join a room · PlaceMe Mobile" },
      { property: "og:description", content: "Tap in with a 4-digit room code." },
    ],
  }),
  component: () => (
    <ProtectedRoute redirectTo="/app/login">
      <NativeJoin />
    </ProtectedRoute>
  ),
});

// Main route component: renders the mobile join screen with a real
// room-code entry card, a search field, and a list of real open rooms.
function NativeJoin() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openRooms, setOpenRooms] = useState<OpenRoom[] | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [durationFilter, setDurationFilter] = useState<"any" | "short" | "long">("any");
  const [seatsFilter, setSeatsFilter] = useState<"any" | "small" | "large">("any");
  const filtersActive = durationFilter !== "any" || seatsFilter !== "any";

  useEffect(() => {
    listOpenRooms(session)
      .then((r) => setOpenRooms(r.rooms))
      .catch(() => setOpenRooms([]));
  }, [session]);

  const visibleRooms = (openRooms ?? []).filter((r) => {
    const q = search.trim().toLowerCase();
    if (q && !`${r.topicText ?? ""} ${r.hostDisplayName}`.toLowerCase().includes(q)) return false;
    if (durationFilter === "short" && r.durationSeconds > 600) return false;
    if (durationFilter === "long" && r.durationSeconds <= 600) return false;
    if (seatsFilter === "small" && r.maxParticipants > 6) return false;
    if (seatsFilter === "large" && r.maxParticipants <= 6) return false;
    return true;
  });

  // Joins the entered room code via the API and navigates into its lobby.
  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const room = await joinRoomByCode(session, code.trim());
      navigate({ to: "/app/lobby", search: { roomId: room.id, code: room.code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <NativeTabScreen title="Join">
      <div className="space-y-5 pb-4">
        <form onSubmit={onSubmit}>
          <PmCard glass className="p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Room code</p>
            <PmInput
              placeholder="GD-0000"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-3 text-center font-mono text-2xl font-bold tracking-[0.2em]"
            />
            {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
            <PmButton
              type="submit"
              block
              size="lg"
              className="mt-5"
              loading={busy}
              disabled={busy || !code.trim()}
            >
              {busy ? "Joining…" : "Join room"}
            </PmButton>
          </PmCard>
        </form>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <PmInput
            placeholder="Search topics or hosts"
            icon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <PmButton variant="outline" onClick={() => setFiltersOpen(true)}>
            Filters{filtersActive ? " •" : ""}
          </PmButton>
        </div>

        <div className="space-y-3">
          {openRooms === null && <CardSkeleton />}
          {visibleRooms.map((r) => (
            <RoomCard key={r.code} room={toRoomCard(r)} onSelect={() => setCode(r.code)} />
          ))}
          {openRooms && visibleRooms.length === 0 && (
            <EmptyState
              icon={<Search />}
              title="No open rooms right now"
              description="Every public room is either full or already in session."
            />
          )}
        </div>
      </div>
      <PmDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        description="Narrow down the rooms open right now"
        sheetOnMobile
        footer={
          <>
            <PmButton
              variant="ghost"
              block
              onClick={() => {
                setDurationFilter("any");
                setSeatsFilter("any");
              }}
            >
              Reset
            </PmButton>
            <PmButton block onClick={() => setFiltersOpen(false)}>
              Done
            </PmButton>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Duration">
            <PmSelect
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value as typeof durationFilter)}
            >
              <option value="any">Any duration</option>
              <option value="short">10 min or less</option>
              <option value="long">More than 10 min</option>
            </PmSelect>
          </Field>
          <Field label="Seats">
            <PmSelect
              value={seatsFilter}
              onChange={(e) => setSeatsFilter(e.target.value as typeof seatsFilter)}
            >
              <option value="any">Any group size</option>
              <option value="small">6 seats or fewer</option>
              <option value="large">More than 6 seats</option>
            </PmSelect>
          </Field>
        </div>
      </PmDialog>
    </NativeTabScreen>
  );
}
