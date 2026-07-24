import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listNotificationTemplates } from "@/modules/notifications";
import { NotificationTemplateForm } from "@/modules/notifications/presentation/components/NotificationTemplateForm";
import { createNotificationTemplateAction } from "@/modules/notifications/presentation/controllers/createNotificationTemplate.action";

export default async function NotificationTemplatesPage() {
  const { authContext } = await requirePermission("notification.template.manage");
  const templates = await listNotificationTemplates(authContext.organizationId);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/notifications" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Notifications
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Notification Templates</h1>
        <p className="text-muted mt-1 text-sm">
          Create, version, and archive Email / SMS / WhatsApp templates.
        </p>
      </div>

      <section className="mx-card p-5">
        <h2 className="mb-4 text-sm font-medium">Create Template</h2>
        <NotificationTemplateForm action={createNotificationTemplateAction} />
      </section>

      <section className="mx-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 ">
          <h2 className="text-sm font-medium">Templates</h2>
        </div>
        <ul className="flex flex-col">
          {templates.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">No templates yet.</li>
          ) : (
            templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-0 "
              >
                <Link
                  href={`/notifications/templates/${template.id}`}
                  className="text-accent hover:text-accent hover:underline underline-offset-4"
                >
                  {template.code} · {template.channelType}
                </Link>
                <span className="text-muted">{template.status}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
