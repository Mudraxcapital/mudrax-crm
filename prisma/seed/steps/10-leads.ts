// ============================================================================
// prisma/seed/steps/10-leads.ts
//
// Seeds realistic demo data (requirement #5) for `leads`: eight Leads (one
// per demo Customer) spread across the pipeline defined in
// 04-lead-catalogs.ts, each with an initial Lead Assignment, and a handful
// with Call Feedback / Notes / Tags to make the demo pipeline feel lived-in.
//
// Lead has no natural business unique key, so its id is derived with
// `seedId()` for idempotency.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { AssignmentType } from "@prisma/client";
import { seedId } from "../lib/determinism";
import { explain, section, summary } from "../lib/logger";
import type { CustomerSeedResult } from "./09-customers";
import type { LeadCatalogSeedResult } from "./04-lead-catalogs";

interface LeadSeed {
  customerKey: string;
  phone: string;
  email: string;
  source: string;
  stage: string;
  lostReason?: string;
  tags?: string[];
  callFeedback?: { status: string; durationSeconds: number | null; notes: string };
  note?: string;
}

const LEADS: LeadSeed[] = [
  {
    customerKey: "rahul-sharma",
    phone: "+919876543210",
    email: "rahul.sharma@example.com",
    source: "Website",
    stage: "Fresh",
  },
  {
    customerKey: "priya-patel",
    phone: "+919876543211",
    email: "priya.patel@example.com",
    source: "Facebook Ads",
    stage: "Contacted",
    callFeedback: {
      status: "Connected - Call Back Later",
      durationSeconds: 95,
      notes: "Asked to call back next week after salary credit.",
    },
  },
  {
    customerKey: "amit-verma",
    phone: "+919876543212",
    email: "amit.verma@example.com",
    source: "Referral",
    stage: "Interested",
    tags: ["Hot Lead"],
    callFeedback: {
      status: "Connected - Interested",
      durationSeconds: 210,
      notes: "Interested in a Personal Loan for home renovation.",
    },
  },
  {
    customerKey: "sneha-reddy",
    phone: "+919876543213",
    email: "sneha.reddy@example.com",
    source: "Google Ads",
    stage: "Follow-up Scheduled",
    note: "Wants a comparison of HDFC vs ICICI personal loan rates before deciding.",
  },
  {
    customerKey: "vikram-singh",
    phone: "+919876543214",
    email: "vikram.singh@example.com",
    source: "Data",
    stage: "Documentation In Progress",
    tags: ["High Ticket Size"],
    note: "Salary slips and Form 16 for last 2 years requested.",
  },
  {
    customerKey: "anjali-nair",
    phone: "+919876543215",
    email: "anjali.nair@example.com",
    source: "WhatsApp Inquiry",
    stage: "Submitted to Bank",
    tags: ["VIP Customer"],
  },
  {
    customerKey: "rajesh-kumar",
    phone: "+919876543216",
    email: "rajesh.kumar@example.com",
    source: "Cold Call",
    stage: "Won",
    tags: ["Repeat Customer"],
  },
  {
    customerKey: "neha-gupta",
    phone: "+919876543217",
    email: "neha.gupta@example.com",
    source: "Walk-in",
    stage: "Lost",
    lostReason: "Interest Rate Too High",
  },
];

export interface LeadSeedResult {
  leadIds: Record<string, string>;
}

export async function seedLeads(
  prisma: PrismaClient,
  organizationId: string,
  customers: CustomerSeedResult,
  catalogs: LeadCatalogSeedResult,
  adminUserId: string,
): Promise<LeadSeedResult> {
  section("10. Leads (demo pipeline)");

  explain(
    "Eight Leads, one per demo Customer, spread across every Lead Stage from Fresh through the two terminal Closed outcomes (Won/Lost).",
  );

  const leadIds: Record<string, string> = {};

  for (const lead of LEADS) {
    const customerId = customers.customerIds[lead.customerKey];
    const leadSourceId = catalogs.leadSourceIds[lead.source];
    const currentStageId = catalogs.leadStageIds[lead.stage];
    const lostReasonId = lead.lostReason ? catalogs.lostReasonIds[lead.lostReason] : undefined;
    if (!customerId || !leadSourceId || !currentStageId) continue;

    const leadId = seedId(`lead:${lead.customerKey}`);
    const isWon = lead.stage === "Won";
    const isLost = lead.stage === "Lost";

    const customerRow = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });

    await prisma.lead.upsert({
      where: { id: leadId },
      update: {
        currentStageId,
        lostReasonId,
        currentAssigneeUserId: adminUserId,
      },
      create: {
        id: leadId,
        organizationId,
        customerId,
        leadSourceId,
        currentStageId,
        lostReasonId,
        currentAssigneeUserId: adminUserId,
        fullNameSnapshot: customerRow.fullName,
        phoneSnapshot: lead.phone,
        emailSnapshot: lead.email,
        wonAt: isWon ? new Date() : undefined,
        lostAt: isLost ? new Date() : undefined,
      },
    });
    leadIds[lead.customerKey] = leadId;

    const hasOpenAssignment = await prisma.leadAssignment.findFirst({
      where: { leadId, unassignedAt: null },
    });
    if (!hasOpenAssignment) {
      await prisma.leadAssignment.create({
        data: {
          leadId,
          assignedToUserId: adminUserId,
          assignmentType: AssignmentType.INITIAL,
        },
      });
    }

    if (lead.tags) {
      for (const tagName of lead.tags) {
        const tagId = catalogs.tagIds[tagName];
        if (!tagId) continue;
        await prisma.leadTag.upsert({
          where: { leadId_tagId: { leadId, tagId } },
          update: {},
          create: { leadId, tagId },
        });
      }
    }

    if (lead.callFeedback) {
      const callFeedbackStatusId = catalogs.callFeedbackStatusIds[lead.callFeedback.status];
      if (callFeedbackStatusId) {
        const feedbackId = seedId(`lead-call-feedback:${lead.customerKey}`);
        const existingFeedback = await prisma.leadCallFeedback.findUnique({
          where: { id: feedbackId },
        });
        if (!existingFeedback) {
          await prisma.leadCallFeedback.create({
            data: {
              id: feedbackId,
              leadId,
              callFeedbackStatusId,
              recordedByUserId: adminUserId,
              durationSeconds: lead.callFeedback.durationSeconds ?? undefined,
              notes: lead.callFeedback.notes,
            },
          });
        }
      }
    }

    if (lead.note) {
      const noteId = seedId(`lead-note:${lead.customerKey}`);
      const existingNote = await prisma.leadNote.findUnique({ where: { id: noteId } });
      if (!existingNote) {
        await prisma.leadNote.create({
          data: { id: noteId, leadId, authorUserId: adminUserId, body: lead.note },
        });
      }
    }
  }

  summary("Leads", LEADS.length);
  return { leadIds };
}
