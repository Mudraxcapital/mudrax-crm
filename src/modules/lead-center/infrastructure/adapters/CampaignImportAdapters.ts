// ============================================================================
// src/modules/lead-center/infrastructure/adapters/CampaignImportAdapters.ts
// ============================================================================

import {
  createCustomer,
  findCustomerByContact,
  DuplicateCustomerIdentifierError,
} from "@/modules/customers";
import { createLead, leadCatalogs } from "@/modules/leads";
import {
  addCampaignMember,
  assignCampaignLeads,
  createCampaign,
  getCampaign,
} from "@/modules/campaigns";
import type {
  CampaignLookupPort,
  CreateCampaignLeadPort,
  LeadSourceResolvePort,
  ResolveCustomerPort,
} from "../../application/ports/CampaignImportPorts";
import { catalogNameForSourceCode } from "../../application/services/mapSourceToLeadCatalog";

export class CustomersResolveAdapter implements ResolveCustomerPort {
  async resolveOrCreate(input: {
    organizationId: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    actorUserId: string;
    ownerManagerId?: string | null;
  }) {
    const existing = await findCustomerByContact(input.organizationId, {
      phone: input.phone,
      email: input.email,
    });
    if (existing) {
      return {
        id: existing.id,
        organizationId: input.organizationId,
        fullName: existing.fullName,
      };
    }

    const identifiers: Array<{ type: "PHONE" | "EMAIL"; value: string }> = [];
    if (input.phone?.trim()) identifiers.push({ type: "PHONE", value: input.phone.trim() });
    if (input.email?.trim()) identifiers.push({ type: "EMAIL", value: input.email.trim() });
    if (identifiers.length === 0) {
      identifiers.push({
        type: "EMAIL",
        value: `leadcenter+${Date.now()}.${Math.random().toString(36).slice(2, 8)}@mudrax.local`,
      });
    }

    try {
      const created = await createCustomer({
        organizationId: input.organizationId,
        input: { fullName: input.fullName, identifiers },
        actor: { actorType: "USER", actorId: input.actorUserId },
        ownerManagerId: input.ownerManagerId ?? null,
      });
      return {
        id: created.id,
        organizationId: created.organizationId,
        fullName: created.fullName,
      };
    } catch (error) {
      if (error instanceof DuplicateCustomerIdentifierError) {
        const again = await findCustomerByContact(input.organizationId, {
          phone: input.phone,
          email: input.email,
        });
        if (again) {
          return {
            id: again.id,
            organizationId: input.organizationId,
            fullName: again.fullName,
          };
        }
      }
      throw error;
    }
  }
}

export class CreateCampaignLeadAdapter implements CreateCampaignLeadPort {
  async create(input: {
    organizationId: string;
    customerId: string;
    leadSourceId: string;
    fullNameSnapshot: string;
    phoneSnapshot?: string | null;
    emailSnapshot?: string | null;
    campaignId: string;
    ownerManagerId?: string | null;
    ownerTeamLeadId?: string | null;
    actorUserId: string;
  }) {
    const lead = await createLead({
      organizationId: input.organizationId,
      input: {
        customerId: input.customerId,
        leadSourceId: input.leadSourceId,
        fullNameSnapshot: input.fullNameSnapshot,
        phoneSnapshot: input.phoneSnapshot ?? undefined,
        emailSnapshot: input.emailSnapshot ?? undefined,
      },
      actor: { actorType: "USER", actorId: input.actorUserId },
      campaignId: input.campaignId,
      ownerManagerId: input.ownerManagerId ?? null,
      ownerTeamLeadId: input.ownerTeamLeadId ?? null,
    });
    return { id: lead.id };
  }
}

export class LeadSourceResolveAdapter implements LeadSourceResolvePort {
  async resolveSourceId(organizationId: string, sourceCode: string): Promise<string> {
    const sources = await leadCatalogs.listSources(organizationId);
    const wanted = catalogNameForSourceCode(sourceCode).toLowerCase();
    const hit =
      sources.find((source) => source.name.toLowerCase() === wanted && source.isActive) ??
      sources.find(
        (source) => source.name.toLowerCase() === "data" && source.isActive,
      ) ??
      sources.find((source) => source.isActive) ??
      sources[0];
    if (!hit) {
      throw new Error("No Lead Source catalog configured for this organization.");
    }
    return hit.id;
  }
}

export class CampaignLookupAdapter implements CampaignLookupPort {
  async getCampaign(campaignId: string) {
    try {
      const campaign = await getCampaign(campaignId);
      return {
        id: campaign.id,
        organizationId: campaign.organizationId,
        name: campaign.name,
        status: campaign.status,
        ownerManagerId: campaign.ownerManagerId,
      };
    } catch {
      return null;
    }
  }

  async createCampaign(input: {
    organizationId: string;
    name: string;
    description?: string;
    ownerManagerId: string;
    actorUserId: string;
    memberUserIds?: string[];
  }) {
    const created = await createCampaign({
      organizationId: input.organizationId,
      input: {
        name: input.name,
        description: input.description,
        memberUserIds: input.memberUserIds,
      },
      actor: { actorType: "USER", actorId: input.actorUserId },
      ownerManagerId: input.ownerManagerId,
    });

    for (const userId of input.memberUserIds ?? []) {
      try {
        await addCampaignMember({
          campaignId: created.id,
          input: { userId },
          actor: { actorType: "USER", actorId: input.actorUserId },
        });
      } catch {
        // Member may already exist or fail validation — import can still proceed.
      }
    }

    return { id: created.id, name: created.name };
  }

  async assignLeads(input: {
    campaignId: string;
    leadIds: string[];
    allocationMethod: "EQUAL" | "ROUND_ROBIN" | "RANDOM" | "MANUAL";
    manualAssigneeUserId?: string;
    actorUserId: string;
  }) {
    await assignCampaignLeads({
      campaignId: input.campaignId,
      input: {
        leadIds: input.leadIds,
        allocationMethod: input.allocationMethod,
        manualAssigneeUserId: input.manualAssigneeUserId,
      },
      actor: { actorType: "USER", actorId: input.actorUserId },
    });
  }
}
