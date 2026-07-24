// ============================================================================
// prisma/seed/steps/14-notification-catalogs.ts
//
// Seeds sample Notification Templates (Email/SMS/WhatsApp) plus ACTIVE
// Channels with Null Providers for the notifications module.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { explain, section, summary } from "../lib/logger";

export interface NotificationCatalogSeedResult {
  templateIds: Record<string, string>;
}

const TEMPLATES: {
  code: string;
  channelType: "EMAIL" | "SMS" | "WHATSAPP";
  subject?: string;
  body: string;
}[] = [
  {
    code: "lead.assigned.email",
    channelType: "EMAIL",
    subject: "Lead assigned: {{leadName}}",
    body: "Hello {{agentName}}, a new lead {{leadName}} has been assigned to you.",
  },
  {
    code: "lead.assigned.sms",
    channelType: "SMS",
    body: "Mudrax: Lead {{leadName}} assigned to you.",
  },
  {
    code: "otp.login.whatsapp",
    channelType: "WHATSAPP",
    body: "Your Mudrax OTP is {{otp}}. It expires in 5 minutes.",
  },
];

export async function seedNotificationCatalogs(
  prisma: PrismaClient,
  organizationId: string,
): Promise<NotificationCatalogSeedResult> {
  section("14. Notifications module catalogs (Templates, Channels, Null Providers)");

  explain(
    "Three ACTIVE Notification Templates (Email/SMS/WhatsApp) with published Version 1, plus ACTIVE Channels wired to Null Providers.",
  );

  const templateIds: Record<string, string> = {};

  for (const channelType of ["EMAIL", "SMS", "WHATSAPP"] as const) {
    const channel = await prisma.notificationChannel.upsert({
      where: { organizationId_channelType: { organizationId, channelType } },
      update: { status: "ACTIVE" },
      create: { organizationId, channelType, status: "ACTIVE" },
    });

    const existingProvider = await prisma.provider.findFirst({
      where: { organizationId, channelId: channel.id },
    });
    if (!existingProvider) {
      await prisma.provider.create({
        data: {
          organizationId,
          channelId: channel.id,
          providerType:
            channelType === "EMAIL"
              ? "SENDGRID"
              : channelType === "SMS"
                ? "TWILIO"
                : "META_WHATSAPP",
          configuration: {
            adapter: "null",
            description: "Seeded Null Notification Provider — no external vendor call.",
          },
          status: "ACTIVE",
        },
      });
    }
  }

  for (const templateDef of TEMPLATES) {
    const template = await prisma.notificationTemplate.upsert({
      where: {
        organizationId_code: { organizationId, code: templateDef.code },
      },
      update: { status: "ACTIVE", channelType: templateDef.channelType },
      create: {
        organizationId,
        code: templateDef.code,
        channelType: templateDef.channelType,
        status: "ACTIVE",
      },
    });
    templateIds[templateDef.code] = template.id;

    const existingVersion = await prisma.notificationTemplateVersion.findFirst({
      where: { templateId: template.id, versionNumber: 1 },
    });
    if (!existingVersion) {
      await prisma.notificationTemplateVersion.create({
        data: {
          templateId: template.id,
          versionNumber: 1,
          subject: templateDef.subject ?? null,
          body: templateDef.body,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
    } else if (existingVersion.status !== "PUBLISHED") {
      await prisma.notificationTemplateVersion.update({
        where: { id: existingVersion.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    }
  }

  summary("Notification Templates", TEMPLATES.length);
  summary("Notification Channels", 3);

  return { templateIds };
}
