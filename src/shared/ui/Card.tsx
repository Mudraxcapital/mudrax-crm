import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-muted mt-0.5 text-xs leading-relaxed">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-card group relative overflow-hidden p-5 transition-shadow duration-200 hover:shadow-md",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <p className="text-muted text-[11px] font-medium tracking-wider uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      {hint || trend ? (
        <div className="text-muted mt-2 flex items-center justify-between gap-2 text-xs">
          {hint ? <span>{hint}</span> : <span />}
          {trend}
        </div>
      ) : null}
    </div>
  );
}
