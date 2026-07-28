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
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import type { NamedCount } from "../_lib/leaderboardTypes";

const CHART_COLORS = [
  "var(--accent)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "#64748b",
  "#0f766e",
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

function HorizontalBar({ data, height = 240 }: { data: NamedCount[]; height?: number }) {
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

function TrendLine({ data }: { data: NamedCount[] }) {
  if (data.length === 0) return <EmptyChart label="No conversions in the selected range." />;
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="count"
            name="Won"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Donut({ data }: { data: NamedCount[] }) {
  if (data.length === 0 || data.every((entry) => entry.count === 0)) {
    return <EmptyChart />;
  }
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            isAnimationActive={false}
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
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-xs text-[var(--foreground)]">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function Funnel({ data }: { data: NamedCount[] }) {
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
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function LeaderboardCharts({
  callOutcomes,
  stageDistribution,
  conversionTrend,
  leadFunnel,
  campaignContribution,
  simplified,
}: {
  callOutcomes: NamedCount[];
  stageDistribution: NamedCount[];
  conversionTrend: NamedCount[];
  leadFunnel: NamedCount[];
  campaignContribution: NamedCount[];
  simplified?: boolean;
}) {
  if (simplified) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Lead Status Breakdown" description="Current assigned lead stages." />
          <CardBody>
            <HorizontalBar data={stageDistribution.slice(0, 8)} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Performance Trend" description="Won leads over the selected period." />
          <CardBody>
            <TrendLine data={conversionTrend} />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Call Outcome" description="Catalog outcomes in the selected range." />
        <CardBody>
          <Donut data={callOutcomes.slice(0, 8)} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Lead Status Distribution" description="Assigned leads by stage." />
        <CardBody>
          <HorizontalBar data={stageDistribution.slice(0, 10)} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Conversion Trend" description="Won leads by day." />
        <CardBody>
          <TrendLine data={conversionTrend} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Lead Funnel" description="Lifecycle buckets for assigned leads." />
        <CardBody>
          <Funnel data={leadFunnel} />
        </CardBody>
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader
          title="Campaign Contribution"
          description="Assigned leads by campaign in this selection."
        />
        <CardBody>
          <HorizontalBar data={campaignContribution.slice(0, 10)} height={280} />
        </CardBody>
      </Card>
    </div>
  );
}
