import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listCustomers } from "@/modules/customers";
import { listNotificationTemplates } from "@/modules/notifications";
import { listUserSummaries } from "@/modules/users";
import { SendNotificationForm } from "@/modules/notifications/presentation/components/SendNotificationForm";
import { sendNotificationAction } from "@/modules/notifications/presentation/controllers/sendNotification.action";

export default async function SendNotificationPage() {
  const { authContext } = await requirePermission("notification.send");

  const [templates, users, customers] = await Promise.all([
    listNotificationTemplates(authContext.organizationId, { status: "ACTIVE" }),
    listUserSummaries(authContext.organizationId),
    listCustomers(authContext.organizationId),
  ]);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/notifications" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Notifications
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Send Notification</h1>
        <p className="text-muted mt-1 text-sm">
          Queue an Email, SMS, or WhatsApp notification through the Null provider.
        </p>
      </div>

      <section className="mx-card p-5">
        <SendNotificationForm
          action={sendNotificationAction}
          templates={templates.map((template) => ({
            id: template.id,
            label: `${template.code} (${template.channelType})`,
          }))}
          users={users.map((user) => ({ id: user.id, fullName: user.fullName }))}
          customers={customers.map((customer) => ({
            id: customer.id,
            label: customer.fullName,
          }))}
        />
      </section>
    </div>
  );
}
