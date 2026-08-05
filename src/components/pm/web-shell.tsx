import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Clock3,
  Home,
  LogIn,
  LogOut,
  PlusCircle,
  Search,
  Shuffle,
  Smartphone,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { PmAvatar, PmBadge, PmButton, PmInput } from "./kit";

// Responsive web app shell: sidebar nav on desktop, top nav on tablet, and
// bottom tab bar on mobile web, wrapping the "/" (web) routes.
//
// Exports:
// - webNav: the nav route/label/icon definitions shared across layouts.
// - Logo: the PlaceMe logo/wordmark, linking home.
// - WebShell: the responsive page shell (nav + optional title/subtitle/
//   actions header + content).

// Derives a display name/initials/email for the signed-in user, falling back
// through user_metadata.display_name -> email -> "Signed in".
function useDisplayName() {
  const { user } = useAuth();
  const name =
    (user?.user_metadata?.["display_name"] as string | undefined) || user?.email || "Signed in";
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { name, initials, email: user?.email ?? "" };
}

// Button that signs the user out and redirects to /login.
function SignOutButton({ className }: { className?: string }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => signOut().then(() => navigate({ to: "/login" }))}
      className={cn(
        "flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-label="Log out"
    >
      <LogOut className="size-4" /> Log out
    </button>
  );
}

// Top-level nav entries shared by the sidebar, top nav, and bottom tab bar.
export const webNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/rooms/new", label: "New Room", icon: PlusCircle },
  { to: "/join", label: "Join", icon: LogIn },
  { to: "/match", label: "Random", icon: Shuffle },
  { to: "/history", label: "History", icon: Clock3 },
] as const;

// PlaceMe logo mark, linking to home; `compact` hides the wordmark and shows
// just the icon.
export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5">
      {/* Graduation cap icon — matches the PlaceMe brand mark */}
      <span className="shrink-0">
        <svg
          width="36"
          height="36"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Cap board (top flat diamond) */}
          <polygon points="32,8 62,22 32,36 2,22" fill="#2563EB" />
          {/* Cap skull / base */}
          <path d="M16 28v13c0 5 7.2 9 16 9s16-4 16-9V28L32 36 16 28Z" fill="#2563EB" />
          {/* Tassel cord */}
          <line
            x1="62"
            y1="22"
            x2="62"
            y2="37"
            stroke="#2563EB"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Tassel knot */}
          <circle cx="62" cy="38" r="3" fill="#2563EB" />
          {/* Tassel fringe */}
          <line
            x1="62"
            y1="41"
            x2="59"
            y2="50"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="62"
            y1="41"
            x2="62"
            y2="51"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="62"
            y1="41"
            x2="65"
            y2="50"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact ? (
        <span className="font-display text-lg font-bold tracking-tight text-[#1a3fa8]">
          PlaceMe
        </span>
      ) : null}
    </Link>
  );
}

// True when the given nav path matches the current route (exact match for
// "/", prefix match otherwise).
function useActive(to: string) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

// Single nav link, styled per layout: "sidebar"/"top" render icon+label
// inline, "bottom" renders a stacked icon-over-label tab.
function NavLink({
  to,
  label,
  icon: Icon,
  variant,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  variant: "sidebar" | "top" | "bottom";
}) {
  const active = useActive(to);
  if (variant === "bottom") {
    return (
      <Link
        to={to}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors",
          active ? "text-primary-glow" : "text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
        {label}
      </Link>
    );
  }
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        variant === "top" && "px-3 py-2",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

// Responsive page shell for the web routes: fixed sidebar + "Pro tip" panel
// + user footer on desktop, a top nav bar on tablet, and a top bar + bottom
// tab bar on mobile. Renders an optional title/subtitle/actions header (with
// a search box on wide screens) above `children`.
export function WebShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const me = useDisplayName();
  return (
    <div className="aurora min-h-screen bg-background">
      {/* Desktop / laptop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
        <Logo />
        <nav className="mt-8 space-y-1">
          {webNav.map((i) => (
            <NavLink key={i.to} {...i} variant="sidebar" />
          ))}
        </nav>
        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <PmBadge tone="accent">
              <Sparkles className="size-3" /> Pro tip
            </PmBadge>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              Sessions with 6 speakers give the sharpest AI feedback signal.
            </p>
          </div>
          <Link
            to="/app"
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Smartphone className="size-4" /> Open mobile app
          </Link>
          <div className="flex min-w-0 items-center gap-3 border-t border-border pt-4">
            <PmAvatar initials={me.initials} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{me.name}</p>
              {/* College string has no backend field yet — docs/BACKEND_REQUIREMENTS.md#BE-14 */}
              <p className="truncate text-xs text-muted-foreground">{me.email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Tablet top navigation */}
      <header className="sticky top-0 z-30 hidden border-b border-border bg-background/80 backdrop-blur-xl md:block lg:hidden">
        <div className="flex items-center gap-4 px-6 py-3">
          <Logo />
          <nav className="flex flex-1 items-center justify-center gap-1">
            {webNav.map((i) => (
              <NavLink key={i.to} {...i} variant="top" />
            ))}
          </nav>
          <PmButton variant="ghost" size="iconSm" aria-label="Notifications">
            <Bell />
          </PmButton>
          <PmAvatar initials={me.initials} size="sm" />
          <SignOutButton />
        </div>
      </header>

      {/* Mobile web top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <PmButton variant="ghost" size="iconSm" aria-label="Notifications">
            <Bell />
          </PmButton>
          <PmAvatar initials={me.initials} size="sm" />
        </div>
      </header>

      <div className="lg:pl-64">
        {title ? (
          <div className="hidden border-b border-border px-6 py-5 lg:block xl:px-10">
            <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden w-64 xl:block">
                  <PmInput placeholder="Search rooms, topics…" icon={<Search />} />
                </div>
                {actions}
              </div>
            </div>
          </div>
        ) : null}
        <main className="mx-auto max-w-[1200px] px-4 pb-28 pt-5 md:px-6 md:pb-12 xl:px-10">
          {title ? (
            <div className="mb-5 lg:hidden">
              <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
              {actions ? <div className="mt-4 flex gap-3">{actions}</div> : null}
            </div>
          ) : null}
          {children}
        </main>
      </div>

      {/* Mobile web bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {webNav.map((i) => (
          <NavLink key={i.to} {...i} variant="bottom" />
        ))}
      </nav>
    </div>
  );
}
