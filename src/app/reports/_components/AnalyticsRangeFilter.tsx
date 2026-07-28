"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
} from "../_lib/analyticsRange";

function AnalyticsRangeFilterInner({ selected }: { selected: AnalyticsRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(range: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (range === "30d") {
      params.delete("range");
    } else {
      params.set("range", range);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  }

  return (
    <div className="mx-card flex flex-wrap items-end gap-3 p-4">
      <label className="flex min-w-[200px] flex-col gap-1.5 text-sm">
        <span className="mx-label">Date range</span>
        <select
          className="mx-input"
          value={selected}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Analytics date range"
        >
          {ANALYTICS_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-muted pb-2 text-xs">
        Trend and conversion charts use this window. Stage and source totals remain live.
      </p>
    </div>
  );
}

export function AnalyticsRangeFilter({ selected }: { selected: AnalyticsRange }) {
  return (
    <Suspense
      fallback={
        <div className="mx-card p-4">
          <p className="text-muted text-sm">Loading range…</p>
        </div>
      }
    >
      <AnalyticsRangeFilterInner selected={selected} />
    </Suspense>
  );
}
