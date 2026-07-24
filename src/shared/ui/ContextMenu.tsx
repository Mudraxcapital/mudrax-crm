"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "./cn";
import type { MenuItem } from "./Dropdown";

/** Right-click context menu for dense enterprise tables and boards. */
export function ContextMenu({
  children,
  items,
}: {
  children: ReactNode;
  items: MenuItem[];
}) {
  const [open, setOpen] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function close() {
      setOpen(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className="contents"
      onContextMenu={(event) => {
        event.preventDefault();
        setOpen({ x: event.clientX, y: event.clientY });
      }}
    >
      {children}
      {open ? (
        <div
          role="menu"
          className="fixed z-[80] min-w-[11rem] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-md"
          style={{ left: open.x, top: open.y }}
        >
          {items.map((item) =>
            item.separator ? (
              <div key={item.id} className="my-1 border-t border-border" role="separator" />
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm hover:bg-surface-sunken",
                  item.danger && "text-danger",
                )}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(null);
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
