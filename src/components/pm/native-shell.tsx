import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Clock3, Home, LogIn, PlusCircle, Shuffle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const nativeTabs = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/new", label: "New Room", icon: PlusCircle },
  { to: "/app/join", label: "Join", icon: LogIn },
  { to: "/app/match", label: "Match", icon: Shuffle },
  { to: "/app/history", label: "History", icon: Clock3 },
] as const;

/** Renders an iPhone 16 Pro (393x852) device frame on large screens, full-bleed on phones. */
export function DeviceFrame({ children }: { children: ReactNode }) {
  return (
    <div className="aurora min-h-screen bg-background md:grid md:place-items-center md:py-10">
      <div className="relative mx-auto w-full md:w-[393px]">
        <div className="relative h-[100dvh] w-full overflow-hidden bg-background md:h-[852px] md:rounded-[54px] md:border-[10px] md:border-secondary md:shadow-[0_40px_120px_-30px_oklch(0_0_0/80%)]">
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ dark }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "relative z-20 flex h-12 shrink-0 items-center justify-between px-7 pt-2 text-[13px] font-semibold",
        dark ? "text-foreground" : "text-foreground",
      )}
    >
      <span>9:41</span>
      <span className="absolute left-1/2 top-2 hidden h-7 w-[110px] -translate-x-1/2 rounded-full bg-black md:block" />
      <span className="flex items-center gap-1.5 text-[11px]">
        <span className="inline-block h-2.5 w-4 rounded-[3px] bg-foreground/80" />
        <span className="inline-block h-2.5 w-3 rounded-[3px] bg-foreground/60" />
        <span className="inline-block h-2.5 w-6 rounded-[3px] border border-foreground/60" />
      </span>
    </div>
  );
}

function HomeIndicator() {
  return (
    <div className="flex h-5 shrink-0 items-center justify-center">
      <span className="h-1 w-32 rounded-full bg-foreground/40" />
    </div>
  );
}

/** Tabbed native screen with a persistent bottom tab bar. */
export function NativeTabScreen({
  children,
  title,
  right,
  largeTitle = true,
}: {
  children: ReactNode;
  title: string;
  right?: ReactNode;
  largeTitle?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <DeviceFrame>
      <div className="flex h-full flex-col">
        <StatusBar />
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pb-2">
          <h1 className={cn("truncate font-bold", largeTitle ? "text-[28px]" : "text-lg")}>
            {title}
          </h1>
          {right}
        </header>
        <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6 pt-2">{children}</main>
        <nav className="flex shrink-0 border-t border-border bg-background/95 px-1 pt-1.5 backdrop-blur-xl">
          {nativeTabs.map(({ to, label, icon: Icon }) => {
            const active = to === "/app" ? pathname === "/app" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 pb-1 text-[10px] font-semibold transition-colors",
                  active ? "text-primary-glow" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-6", active && "drop-shadow-[0_0_8px_currentColor]")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <HomeIndicator />
      </div>
    </DeviceFrame>
  );
}

/** Full-screen stacked (pushed) native screen — no tab bar. */
export function NativeStackScreen({
  children,
  title,
  backTo,
  backLabel = "Back",
  right,
  footer,
  bare,
}: {
  children: ReactNode;
  title?: string;
  backTo?: string;
  backLabel?: string;
  right?: ReactNode;
  footer?: ReactNode;
  bare?: boolean;
}) {
  return (
    <DeviceFrame>
      <div className="flex h-full flex-col">
        <StatusBar />
        {!bare ? (
          <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-3 pb-3">
            {backTo ? (
              <Link
                to={backTo}
                className="flex items-center gap-0.5 text-sm font-medium text-primary-glow"
              >
                <ChevronLeft className="size-5" />
                {backLabel}
              </Link>
            ) : (
              <span className="w-12" />
            )}
            <h1 className="truncate text-center text-[17px] font-semibold">{title}</h1>
            <span className="flex w-16 justify-end">{right}</span>
          </header>
        ) : null}
        <main className="no-scrollbar flex-1 overflow-y-auto">{children}</main>
        {footer ? (
          <div className="shrink-0 border-t border-border bg-background/95 p-4 backdrop-blur-xl">
            {footer}
          </div>
        ) : null}
        <HomeIndicator />
      </div>
    </DeviceFrame>
  );
}