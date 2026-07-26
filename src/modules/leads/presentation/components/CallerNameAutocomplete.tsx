"use client";

import { useMemo, useState } from "react";
import { Input } from "@/shared/ui/Input";

export interface CallerOption {
  id: string;
  fullName: string;
}

/**
 * Replaces raw "Assigned User ID" with name search + hidden UUID.
 * Works together with Campaign / Status / Source filters on the form.
 */
export function CallerNameAutocomplete({
  callers,
  defaultCallerId,
  defaultCallerName,
}: {
  callers: CallerOption[];
  defaultCallerId?: string;
  defaultCallerName?: string;
}) {
  const initial =
    defaultCallerName ??
    callers.find((caller) => caller.id === defaultCallerId)?.fullName ??
    "";
  const [query, setQuery] = useState(initial);
  const [selectedId, setSelectedId] = useState(defaultCallerId ?? "");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return callers.slice(0, 8);
    return callers.filter((caller) => caller.fullName.toLowerCase().includes(q)).slice(0, 8);
  }, [callers, query]);

  return (
    <div className="relative">
      <input type="hidden" name="assignedToUserId" value={selectedId} />
      <Input
        name="callerName"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedId("");
        }}
        placeholder="Caller name…"
        aria-label="Caller name"
        autoComplete="off"
        list="caller-name-suggestions"
      />
      <datalist id="caller-name-suggestions">
        {matches.map((caller) => (
          <option key={caller.id} value={caller.fullName} />
        ))}
      </datalist>
      {query.trim() && !selectedId ? (
        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-border bg-surface shadow-md">
          {matches.map((caller) => (
            <li key={caller.id}>
              <button
                type="button"
                className="hover:bg-surface-sunken w-full px-3 py-1.5 text-left text-sm"
                onClick={() => {
                  setQuery(caller.fullName);
                  setSelectedId(caller.id);
                }}
              >
                {caller.fullName}
              </button>
            </li>
          ))}
          {matches.length === 0 ? (
            <li className="text-muted px-3 py-2 text-xs">No callers match</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
