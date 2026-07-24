"use client";

import { useId, type ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const baseId = useId();
  const active = items.find((item) => item.id === value) ?? items[0];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Sections"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {items.map((item) => {
          const selected = item.id === active?.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${baseId}-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              disabled={item.disabled}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(event) => {
                const enabled = items.filter((t) => !t.disabled);
                const idx = enabled.findIndex((t) => t.id === item.id);
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  onChange(enabled[(idx + 1) % enabled.length]!.id);
                }
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  onChange(enabled[(idx - 1 + enabled.length) % enabled.length]!.id);
                }
              }}
              className={cn(
                "relative -mb-px shrink-0 px-3 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent"
                  : "text-muted hover:text-foreground",
                item.disabled && "opacity-40",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active.id}`}
          aria-labelledby={`${baseId}-${active.id}`}
          className="pt-4"
        >
          {active.content}
        </div>
      ) : null}
    </div>
  );
}

/** Link-style tabs for server pages (URL-driven). */
export function TabNav({
  items,
  activeHref,
}: {
  items: { href: string; label: string }[];
  activeHref: string;
}) {
  return (
    <nav
      aria-label="Section navigation"
      className="flex gap-1 overflow-x-auto border-b border-border"
    >
      {items.map((item) => {
        const active =
          activeHref === item.href ||
          (item.href !== "/" && activeHref.startsWith(`${item.href}/`));
        return (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "relative -mb-px shrink-0 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent"
                : "text-muted hover:text-foreground",
            )}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
