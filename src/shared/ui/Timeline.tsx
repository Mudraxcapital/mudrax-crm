import type { ReactNode } from "react";
import { cn } from "./cn";
import { Badge, type BadgeTone } from "./Badge";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  meta?: ReactNode;
  tone?: BadgeTone;
  href?: string;
}

export function Timeline({
  items,
  empty,
  className,
}: {
  items: TimelineItem[];
  empty?: ReactNode;
  className?: string;
}) {
  if (items.length === 0) {
    return <>{empty}</>;
  }

  return (
    <ol className={cn("relative flex flex-col gap-0", className)}>
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
          {index < items.length - 1 ? (
            <span
              className="bg-border absolute top-3 left-[7px] h-[calc(100%-4px)] w-px"
              aria-hidden
            />
          ) : null}
          <span
            className={cn(
              "relative z-[1] mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-surface",
              item.tone === "success"
                ? "bg-success"
                : item.tone === "danger"
                  ? "bg-danger"
                  : item.tone === "warning"
                    ? "bg-warning"
                    : "bg-accent",
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              {item.href ? (
                <a
                  href={item.href}
                  className="text-sm font-medium tracking-tight hover:text-accent"
                >
                  {item.title}
                </a>
              ) : (
                <p className="text-sm font-medium tracking-tight">{item.title}</p>
              )}
              {item.timestamp ? (
                <time className="text-muted-foreground text-xs tabular-nums">{item.timestamp}</time>
              ) : null}
            </div>
            {item.description ? (
              <p className="text-muted mt-0.5 text-sm leading-relaxed">{item.description}</p>
            ) : null}
            {item.meta ? <div className="mt-2">{item.meta}</div> : null}
            {item.tone ? (
              <div className="mt-2">
                <Badge tone={item.tone} dot>
                  {item.tone}
                </Badge>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
