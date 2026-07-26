import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listCalendarEvents, localDayKey } from "../_lib/calendarEvents";
import {
  agentHierarchyFilter,
  followUpListFilter,
  visibleLeadsFilter,
} from "@/shared/auth/applyHierarchyListFilter";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Card, CardBody } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";

function parseMonthParam(monthParam: string | undefined): Date {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const year = Number(monthParam.slice(0, 4));
    const monthIndex = Number(monthParam.slice(5, 7)) - 1;
    return new Date(year, monthIndex, 1, 0, 0, 0, 0);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, authContext } = await requirePermission("follow_up.view");
  const params = await searchParams;
  const monthParam = typeof params.month === "string" ? params.month : undefined;

  const from = parseMonthParam(monthParam);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59, 999);

  const followUpFilter = followUpListFilter(authContext, {
    permissionCode: "follow_up.view",
    actorUserId: session.user.id,
  });
  const leadFilter = visibleLeadsFilter(authContext, {
    permissionCode: "lead.view",
    actorUserId: session.user.id,
  });
  const agentFilter = agentHierarchyFilter(authContext);

  const events = await listCalendarEvents(
    authContext.organizationId,
    { from, to },
    {
      includeFollowUps: true,
      includeCalls: hasPermission(authContext, "call.view"),
      includeDeadlines: hasPermission(authContext, "lead.view"),
      assignedToUserIds: followUpFilter.assignedToUserIds,
      agentUserId: agentFilter.agentUserId,
      agentUserIds: agentFilter.agentUserIds,
      leadFilter: {
        ownerManagerId: leadFilter.ownerManagerId,
        ownerTeamLeadId: leadFilter.ownerTeamLeadId,
        assignedToUserIds: leadFilter.assignedToUserIds,
      },
    },
  );

  const byDay = new Map<string, typeof events>();
  for (const event of events) {
    const key = localDayKey(event.startsAt);
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  const monthLabel = from.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const prev = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  const next = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  const dayEntries = [...byDay.entries()];

  return (
    <PageSection>
      <PageHeader
        title="Calendar"
        description={`Follow-ups, calls, meetings, and deadlines — ${monthLabel}`}
        actions={
          <>
            <Link href={`/calendar?month=${prevKey}`}>
              <Button variant="secondary" size="sm">
                Previous
              </Button>
            </Link>
            <Link href={`/calendar?month=${nextKey}`}>
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
