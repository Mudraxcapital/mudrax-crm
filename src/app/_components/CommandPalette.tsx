"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/ui/cn";

interface SearchHit {
  entity: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
}

const QUICK_ACTIONS = [
  {
    id: "qa-lead",
    title: "New Lead",
    subtitle: "Quick action",
    href: "/leads",
    permissions: ["lead.create", "lead.view"],
    adminOnly: true,
  },
  {
    id: "qa-customer",
    title: "Customers",
    subtitle: "Quick action",
    href: "/customers",
    permissions: ["customer.view"],
    adminOnly: true,
  },
  {
    id: "qa-pipeline",
    title: "Lead Pipeline (Kanban)",
    subtitle: "Quick action",
    href: "/leads/pipeline",
    permissions: ["lead.view"],
    adminOnly: true,
  },
  {
    id: "qa-import",
    title: "Add from Excel",
    subtitle: "Add Leads from Excel",
    href: "/leads/import",
    permissions: ["lead.import"],
    adminOnly: true,
  },
  {
    id: "qa-leads-all",
    title: "All Leads",
    subtitle: "Quick action",
    href: "/leads",
    permissions: ["lead.view"],
    adminOnly: true,
  },
  {
    id: "qa-calendar",
    title: "Calendar",
    subtitle: "Quick action",
    href: "/calendar",
    permissions: ["follow_up.view"],
    adminOnly: true,
  },
  {
    id: "qa-activity",
    title: "Activity Timeline",
    subtitle: "Quick action",
    href: "/activity",
    permissions: ["lead.view"],
    adminOnly: true,
  },
  {
    id: "qa-duplicates",
    title: "Duplicate Detection",
    subtitle: "Quick action",
    href: "/customers/duplicates",
    permissions: ["customer.merge", "customer.view"],
    adminOnly: true,
  },
  {
    id: "qa-crm",
    title: "CRM Dashboard",
    subtitle: "Quick action",
    href: "/crm",
    permissions: ["customer.view", "lead.view", "campaign.view"],
    adminOnly: true,
  },
  {
    id: "qa-field-settings",
    title: "Lead Settings",
    subtitle: "Quick action",
    href: "/crm/field-settings",
    permissions: ["custom_field.manage"],
    adminOnly: true,
  },
  {
    id: "qa-search",
    title: "Advanced Lead Search",
    subtitle: "Quick action",
    href: "/leads",
    permissions: ["lead.view"],
    adminOnly: true,
  },
] as const;

const CALLER_QUICK_ACTIONS = [
  { id: "cqa-dash", title: "Dashboard", subtitle: "Caller workspace", href: "/" },
  { id: "cqa-campaigns", title: "My Campaigns", subtitle: "Caller workspace", href: "/caller/campaigns" },
  { id: "cqa-leads", title: "My Leads", subtitle: "Caller workspace", href: "/caller/leads" },
  { id: "cqa-history", title: "Call History", subtitle: "Caller workspace", href: "/caller/history" },
  {
    id: "cqa-perf",
    title: "My Performance",
    subtitle: "Caller workspace",
    href: "/caller/performance",
  },
  {
    id: "cqa-notif",
    title: "Notifications",
    subtitle: "Caller workspace",
    href: "/caller/notifications",
  },
  { id: "cqa-profile", title: "Profile", subtitle: "Account settings", href: "/profile" },
] as const;

export const OPEN_COMMAND_PALETTE = "mudrax:open-command-palette";

export function CommandPalette({
  enabled = false,
  permissions = [],
  callerWorkspace = false,
}: {
  /** Staff-only — customers never receive the command palette. */
  enabled?: boolean;
  permissions?: string[];
  /** When true, only Caller Workspace quick actions are offered. */
  callerWorkspace?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(0);
  const held = useMemo(() => new Set(permissions), [permissions]);

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
    };
  }, [enabled]);

  useEffect(() => {
    if (!open || !enabled) return;
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!response.ok) {
          setHits([]);
          return;
        }
        const json = (await response.json()) as { data: SearchHit[] };
        setHits(json.data ?? []);
        setActiveIndex(0);
      });
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query, open, enabled]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      setActiveIndex(0);
    }
  }, [open]);

  const items = useMemo(() => {
    const quickSource = callerWorkspace
      ? CALLER_QUICK_ACTIONS.map((action) => ({
          ...action,
          permissions: [] as string[],
        }))
      : QUICK_ACTIONS.filter((action) => !action.adminOnly || !callerWorkspace).filter((action) =>
          action.permissions.some((code) => held.has(code)),
        );

    const quick = quickSource
      .filter((action) =>
        query.trim()
          ? `${action.title} ${action.subtitle}`.toLowerCase().includes(query.trim().toLowerCase())
          : true,
      )
      .map((action) => ({
        key: action.id,
        title: action.title,
        subtitle: action.subtitle,
        href: action.href,
      }));
    const searchItems = hits.map((hit) => ({
      key: `${hit.entity}-${hit.id}`,
      title: hit.title,
      subtitle: hit.subtitle,
      href: hit.href,
    }));
    return [...(callerWorkspace ? [] : searchItems), ...quick].slice(0, 20);
  }, [hits, query, held, callerWorkspace]);

  if (!enabled || !open) return null;

  return (
    <div
      className="mx-overlay-enter fixed inset-0 z-[70] flex items-start justify-center bg-[var(--surface-overlay)] px-4 pt-[12vh]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="mx-dialog-enter w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-3 py-2">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, items.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (event.key === "Enter") {
                const item = items[activeIndex];
                if (item) {
                  setOpen(false);
                  router.push(item.href);
                }
              }
            }}
            placeholder="Search customers, leads, loans, documents, campaigns…"
            className="w-full bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="mx-scroll max-h-80 overflow-y-auto py-1">
          {pending && query.trim() ? (
            <li className="text-muted px-4 py-3 text-sm">Searching…</li>
          ) : null}
          {items.length === 0 ? (
            <li className="text-muted px-4 py-3 text-sm">
              Type to search, or pick a Quick Action.
            </li>
          ) : (
            items.map((item, index) => (
              <li key={item.key}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col px-4 py-2.5 text-left text-sm transition-colors",
                    index === activeIndex ? "bg-accent-muted" : "hover:bg-surface-sunken",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <span className="font-medium tracking-tight">{item.title}</span>
                  <span className="text-muted text-xs">{item.subtitle}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="text-muted-foreground border-t border-border px-4 py-2 text-xs">
          ↑↓ navigate · Enter open · Esc close
        </div>
      </div>
    </div>
  );
}
