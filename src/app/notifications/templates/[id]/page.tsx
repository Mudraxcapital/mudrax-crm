import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  getNotificationTemplate,
  listTemplateVersions,
  NotificationTemplateNotFoundError,
} from "@/modules/notifications";
import { TemplateVersionForm } from "@/modules/notifications/presentation/components/TemplateVersionForm";
import { createTemplateVersionAction } from "@/modules/notifications/presentation/controllers/createTemplateVersion.action";
import { archiveNotificationTemplateAction } from "@/modules/notifications/presentation/controllers/archiveNotificationTemplate.action";

export default async function NotificationTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authContext } = await requirePermission("notification.template.manage");

  let template;
  try {
    template = await getNotificationTemplate(authContext.organizationId, id);
  } catch (error) {
    if (error instanceof NotificationTemplateNotFoundError) notFound();
    throw error;
  }

  const versions = await listTemplateVersions(authContext.organizationId, id);
  const versionAction = createTemplateVersionAction.bind(null, id);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/notifications/templates" className="text-sm text-accent hover:underline underline-offset-4">
        ← Templates
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{template.code}</h1>
          <p className="text-muted mt-1 text-sm">
            {template.channelType} · {template.status}
          </p>
        </div>
        {template.status !== "ARCHIVED" ? (
          <form action={archiveNotificationTemplateAction.bind(null, id)}>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-2 text-sm "
            >
              Archive
            </button>
          </form>
        ) : null}
      </div>

      <section className="mx-card p-5">
        <h2 className="mb-4 text-sm font-medium">New Version</h2>
        <TemplateVersionForm action={versionAction} />
      </section>

      <section className="mx-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 ">
          <h2 className="text-sm font-medium">Versions</h2>
        </div>
        <ul className="flex flex-col">
          {versions.map((version) => (
            <li
              key={version.id}
              className="border-b border-border px-4 py-3 text-sm last:border-0 "
            >
              <div className="flex items-center justify-between">
                <span>
                  v{version.versionNumber} · {version.status}
                </span>
                <span className="text-muted">
                  {new Date(version.createdAt).toLocaleString()}
                </span>
              </div>
              {version.subject ? (
                <p className="text-muted mt-1 text-xs">Subject: {version.subject}</p>
              ) : null}
              <p className="mt-1 text-xs whitespace-pre-wrap">{version.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
