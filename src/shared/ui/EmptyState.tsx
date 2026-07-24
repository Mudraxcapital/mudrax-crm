import type { ReactNode } from "react";
import { cn } from "./cn";

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="bg-surface-sunken text-muted mb-4 flex size-12 items-center justify-center rounded-xl border border-border">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {description ? (
        <p className="text-muted mt-1.5 max-w-sm text-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "mx-card flex flex-col items-center justify-center border-danger/20 bg-danger-muted/40 px-6 py-12 text-center",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-danger">{title}</h3>
      {description ? <p className="text-muted mt-1.5 max-w-md text-sm">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
