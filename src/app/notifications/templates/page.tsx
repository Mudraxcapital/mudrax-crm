import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listNotificationTemplates } from "@/modules/notifications";
import { NotificationTemplateForm } from "@/modules/notifications/presentation/components/NotificationTemplateForm";
import { createNotificationTemplateAction } from "@/modules/notifications/presentation/controllers/createNotificationTemplate.action";

export default async function NotificationTemplatesPage() {
  const { authContext } = await requirePermission("notification.template.manage");
  const templates = await listNotificationTemplates(authContext.organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/notifications" className="text-sm underline underline-offset-4">
        ← Notifications
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Notification Templates</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Create, version, and archive Email / SMS / WhatsApp templates.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="mb-4 text-sm font-medium">Create Template</h2>
        <NotificationTemplateForm action={createNotificationTemplateAction} />
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Templates</h2>
        </div>
        <ul className="flex flex-col">
          {templates.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">No templates yet.</li>
          ) : (
            templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <Link
                  href={`/notifications/templates/${template.id}`}
                  className="underline underline-offset-4"
                >
                  {template.code} · {template.channelType}
                </Link>
                <span className="text-foreground/60">{template.status}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
