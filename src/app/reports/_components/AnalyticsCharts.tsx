"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartPoint {
  key: string;
  label: string;
  count: number;
}

const CHART_COLORS = [
  "var(--accent)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "#64748b",
  "#0f766e",
  "#b45309",
  "#be123c",
];

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function EmptyChart({ label = "No data yet." }: { label?: string }) {
  return <p className="text-muted py-8 text-center text-sm">{label}</p>;
}

export function HorizontalBarChart({
  data,
  height = 260,
}: {
  data: ChartPoint[];
  height?: number;
}) {
  if (data.length === 0) return <EmptyChart />;
  const chartHeight = Math.max(height, data.length * 36);

  return (
    <div style={{ width: "100%", height: chartHeight }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fontSize: 11, fill: "var(--foreground)" }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Count" fill="var(--accent)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VerticalBarChart({
  data,
  height = 260,
}: {
  data: ChartPoint[];
  height?: number;
}) {
  if (data.length === 0) return <EmptyChart />;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={50}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLineChart({
  data,
  height = 260,
}: {
  data: ChartPoint[];
  height?: number;
}) {
  if (data.length === 0) return <EmptyChart label="No leads in the selected range." />;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="count"
            name="Leads"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent)" }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelBars({ data }: { data: ChartPoint[] }) {
  if (data.every((entry) => entry.count === 0)) {
    return <EmptyChart label="No funnel activity yet." />;
  }

  const max = Math.max(...data.map((entry) => entry.count), 1);

  return (
    <ol className="flex flex-col gap-3">
      {data.map((step, index) => {
        const pct = Math.round((step.count / max) * 100);
        return (
          <li key={step.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium tracking-tight">
                {index + 1}. {step.label}
              </span>
              <span className="text-muted tabular-nums">{step.count}</span>
            </div>
            <div className="bg-surface-sunken h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${pct}%` }}
              />
            </div>
            {index < data.length - 1 ? (
              <p className="text-muted pl-1 text-xs" aria-hidden>
                ↓
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function DonutChart({
  data,
  height = 240,
  onSliceClick,
  showSideLegend = false,
}: {
  data: ChartPoint[];
  height?: number;
  /** Fired with the datum key when a slice (or side-legend row) is clicked. */
  onSliceClick?: (key: string) => void;
  /** Legend beside the pie with percentages (assignee report style). */
  showSideLegend?: boolean;
}) {
  if (data.length === 0 || data.every((entry) => entry.count === 0)) {
    return <EmptyChart />;
  }

  const total = data.reduce((sum, entry) => sum + entry.count, 0) || 1;

  const chart = (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={showSideLegend ? "45%" : "55%"}
            outerRadius={showSideLegend ? "75%" : "80%"}
            paddingAngle={2}
            isAnimationActive={false}
            cursor={onSliceClick ? "pointer" : undefined}
            onClick={(_, index) => {
              const entry = data[index];
              if (entry && onSliceClick) onSliceClick(entry.key);
            }}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.key}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                stroke="var(--surface)"
              />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          {!showSideLegend ? (
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-[var(--foreground)]">{value}</span>
              )}
            />
          ) : null}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  if (!showSideLegend) return chart;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">{chart}</div>
      <ul className="flex max-h-56 min-w-[140px] flex-col gap-1.5 overflow-y-auto text-xs">
        {data.map((entry, index) => {
          const pct = ((entry.count / total) * 100).toFixed(1);
          return (
            <li key={entry.key}>
              <button
                type="button"
                className="hover:bg-surface-sunken flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left"
                onClick={() => onSliceClick?.(entry.key)}
                disabled={!onSliceClick}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate font-medium">{entry.label}</span>
                <span className="text-muted tabular-nums">{pct}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
