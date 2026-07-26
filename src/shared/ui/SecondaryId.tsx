import { cn } from "./cn";

/**
 * Secondary metadata line for operational IDs.
 * Names stay primary; IDs appear only where they aid support/diagnostics.
 */
export function SecondaryId({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className={cn("text-muted font-mono text-xs", className)}>
      {label}: {value}
    </span>
  );
}
