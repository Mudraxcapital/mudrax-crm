import Link from "next/link";
import { requireAuth } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import { listCalendarEvents } from "../_lib/calendarEvents";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Card, CardBody } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, authContext } = await requireAuth();
  const params = await searchParams;
  const monthParam = typeof params.month === "string" ? params.month : undefined;

  const base = monthParam ? new Date(`${monthParam}-01T00:00:00.000Z`) : new Date();
  const from = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const to = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 23, 59, 59));

  const leadScope = getPermissionScope(authContext, "lead.view");
  const followUpScope = getPermissionScope(authContext, "follow_up.view");
  const selfScope =
    leadScope === "SELF" || followUpScope === "SELF" ? [session.user.id] : undefined;

  const events = await listCalendarEvents(
    authContext.organizationId,
    { from, to },
    {
      includeFollowUps: hasPermission(authContext, "follow_up.view"),
      includeCalls: hasPermission(authContext, "call.view"),
      includeDeadlines: hasPermission(authContext, "lead.view"),
      assignedToUserIds: selfScope,
    },
  );

  const byDay = new Map<string, typeof events>();
  for (const event of events) {
    const key = event.startsAt.toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  const monthLabel = from.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const prev = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - 1, 1));
  const next = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
  const dayEntries = [...byDay.entries()];

  return (
    <PageSection>
      <PageHeader
        title="Calendar"
        description={`Follow-ups, calls, meetings, and deadlines — ${monthLabel}`}
        actions={
          <>
            <Link href={`/calendar?month=${prev.toISOString().slice(0, 7)}`}>
              <Button variant="secondary" size="sm">
                Previous
              </Button>
            </Link>
            <Link href={`/calendar?month=${next.toISOString().slice(0, 7)}`}>
              <Button variant="secondary" size="sm">
                Next
              </Button>
            </Link>
          </>
        }
      />

      <Card>
        <CardBody className="p-0">
          {dayEntries.length === 0 ? (
            <EmptyState
              title="No events this month"
              description="Follow-ups and scheduled calls will appear here."
            />
          ) : (
            <div className="divide-y divide-border">
              {dayEntries.map(([day, dayEvents]) => (
                <div key={day} className="px-5 py-4">
                  <h2 className="text-sm font-semibold tracking-tight">{day}</h2>
                  <ul className="mt-2 flex flex-col gap-2">
                    {dayEvents.map((event) => (
                      <li key={event.id} className="flex items-center justify-between gap-3 text-sm">
                        <Link
                          href={event.href}
                          className="hover:text-accent flex min-w-0 items-center gap-2 font-medium"
                        >
                          <Badge tone="info">{event.type}</Badge>
                          <span className="truncate">{event.title}</span>
                        </Link>
                        <span className="text-muted shrink-0 text-xs tabular-nums">
                          {event.startsAt.toLocaleTimeString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </PageSection>
  );
}
