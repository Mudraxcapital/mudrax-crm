import { cn } from "./cn";

export interface ChartDatum {
  key: string;
  label: string;
  value: number;
}

/** Lightweight horizontal bar chart — no chart library required. */
export function BarList({
  data,
  className,
  valueFormatter = (n) => String(n),
}: {
  data: ChartDatum[];
  className?: string;
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return <p className="text-muted text-sm">No data yet.</p>;
  }

  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {data.map((item) => {
        const pct = Math.round((item.value / max) * 100);
        return (
          <li key={item.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{item.label}</span>
              <span className="text-muted shrink-0 tabular-nums font-medium">
                {valueFormatter(item.value)}
              </span>
            </div>
            <div className="bg-surface-sunken h-1.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Simple donut / ring summary. */
export function RingStat({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90" aria-hidden>
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth="8"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{pct}%</p>
        {label ? <p className="text-muted text-xs">{label}</p> : null}
      </div>
    </div>
  );
}
