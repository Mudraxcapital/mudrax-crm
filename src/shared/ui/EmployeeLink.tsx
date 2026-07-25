import Link from "next/link";
import { cn } from "./cn";

/** Clickable employee name → Assigned Customers portfolio. */
export function EmployeeLink({
  userId,
  name,
  className,
  campaignId,
}: {
  userId: string;
  name: string;
  className?: string;
  campaignId?: string;
}) {
  const href = campaignId
    ? `/users/${userId}/assigned?campaignId=${encodeURIComponent(campaignId)}`
    : `/users/${userId}/assigned`;
  return (
    <Link
      href={href}
      className={cn("text-accent hover:underline underline-offset-4", className)}
    >
      {name}
    </Link>
  );
}
