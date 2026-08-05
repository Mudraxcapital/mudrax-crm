"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/shared/ui/cn";
import { ThemeToggle } from "@/shared/ui/ThemeProvider";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { AccountStatusGuard } from "@/modules/auth/presentation/components/AccountStatusGuard";
import { OPEN_COMMAND_PALETTE } from "./CommandPalette";
import { filterNavGroups, isNavActive, navItemKey, NAV_GROUPS } from "./nav";
import { callerNavAsNavGroups } from "./callerNav";
import { NavIconSvg } from "./NavIcons";
import { LoginDurationTimer } from "@/modules/caller-workspace/presentation/components/LoginDurationTimer";
import { NotificationBell } from "@/modules/notifications/presentation/components/NotificationBell";
import { InAppNotificationPopup } from "@/modules/notifications/presentation/components/InAppNotificationPopup";
import { FollowUpDuePopup } from "@/modules/follow-ups/presentation/components/FollowUpDuePopup";

const BARE_PREFIXES = [
  "/login",
  "/session-expired",
  "/clear-session",
  "/unauthorized",
  "/change-password",
];

export interface AppShellUser {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
  isStaff: boolean;
  isCallerWorkspace?: boolean;
  loginAt?: string;
  /** Ended sessions earlier today — daily timer survives logout. */
  priorLoginSecondsToday?: number;
  dayStartedAt?: string;
}

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AppShellUser | null;
}) {
  const pathname = usePathname();
  const bare = BARE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // Customers / non-staff identities never receive the CRM shell.
  if (bare || !user || !user.isStaff) {
    return <>{children}</>;
  }

  return (
    <ShellFrame user={user} pathname={pathname}>
      {children}
    </ShellFrame>
  );
}

function ShellFrame({
  children,
  user,
  pathname,
}: {
  children: ReactNode;
  user: AppShellUser;
  pathname: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navGroups = useMemo(
    () =>
      user.isCallerWorkspace
        ? callerNavAsNavGroups()
        : filterNavGroups(NAV_GROUPS, user.permissions),
    [user.isCallerWorkspace, user.permissions],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const stored = window.localStorage.getItem("mudrax-sidebar-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("mudrax-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen">
      <AccountStatusGuard enabled />
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-[var(--surface-overlay)] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--sidebar-border)] bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300 ease-[var(--ease-out)]",
          collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex h-[var(--topbar-height)] items-center gap-2.5 border-b border-[var(--sidebar-border)] px-3",
            collapsed && "justify-center px-2",
          )}
        >
          <div className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tracking-tight">
            M
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Mudrax CRM</p>
              <p className="truncate text-[11px] text-sidebar-muted">
                {user.isCallerWorkspace ? "Caller workspace" : "Enterprise workspace"}
              </p>
            </div>
          ) : null}
        </div>

        <nav className="mx-scroll flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Main">
          {navGroups.map((group) => (
            <div key={group.id}>
              {!collapsed ? (
                <p className="text-sidebar-muted mb-1.5 px-2 text-[10px] font-semibold tracking-[0.08em] uppercase">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isNavActive(pathname, item);
                  return (
                    <li key={navItemKey(item)}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-[var(--sidebar-active)] text-white"
                            : "text-sidebar-muted hover:bg-[var(--sidebar-hover)] hover:text-sidebar-foreground",
                          collapsed && "justify-center px-2",
                        )}
                      >
                        <NavIconSvg name={item.icon} className="shrink-0 opacity-90" />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--sidebar-border)] p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="text-sidebar-muted hover:bg-[var(--sidebar-hover)] hover:text-sidebar-foreground hidden w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-xs lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d={collapsed ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-[var(--ease-out)]",
          collapsed ? "lg:pl-[var(--sidebar-collapsed)]" : "lg:pl-[var(--sidebar-width)]",
        )}
      >
        <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="mx-btn mx-btn-ghost mx-btn-sm lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className="text-muted hover:text-foreground hover:bg-surface-sunken hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs sm:inline-flex"
            onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))}
          >
            <span>Search</span>
            <kbd className="bg-surface-sunken rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {user.isCallerWorkspace && user.loginAt ? (
              <LoginDurationTimer
                loginAt={user.loginAt}
                priorSecondsToday={user.priorLoginSecondsToday ?? 0}
                dayStartedAt={user.dayStartedAt}
              />
            ) : null}
            <NotificationBell inboxHref="/notifications/inbox" />
            <ThemeToggle />
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface-sunken/50 px-2.5 py-1.5 sm:flex">
              <div className="bg-accent/15 text-accent flex size-7 items-center justify-center rounded-full text-[11px] font-semibold">
                {initials(user.fullName)}
              </div>
              <div className="min-w-0">
                <p className="max-w-[10rem] truncate text-xs font-medium">{user.fullName}</p>
                <p className="text-muted max-w-[10rem] truncate text-[10px]">
                  {user.roles[0] ?? "User"}
                </p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="mx-page flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[var(--content-max)]">{children}</div>
        </main>
        <FollowUpDuePopup
          userId={user.id}
          isCallerWorkspace={user.isCallerWorkspace === true}
        />
        <InAppNotificationPopup inboxHref="/notifications/inbox" />
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
