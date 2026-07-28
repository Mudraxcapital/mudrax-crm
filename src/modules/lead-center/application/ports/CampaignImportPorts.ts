// ============================================================================
// src/modules/lead-center/application/ports/CampaignImportPorts.ts
//
// Ports used when promoting staged leads into Campaign Leads — adapters call
// existing `customers` / `leads` / `campaigns` public APIs only.
// ============================================================================

export interface ResolveCustomerPort {
  resolveOrCreate(input: {
    organizationId: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    actorUserId: string;
    ownerManagerId?: string | null;
  }): Promise<{ id: string; organizationId: string; fullName: string }>;
}

export interface CreateCampaignLeadPort {
  create(input: {
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
  }): Promise<{ id: string }>;
}

export interface LeadSourceResolvePort {
  resolveSourceId(organizationId: string, sourceCode: string): Promise<string>;
}

export interface CampaignLookupPort {
  getCampaign(campaignId: string): Promise<{
    id: string;
    organizationId: string;
    name: string;
    status: string;
    ownerManagerId: string;
  } | null>;
  createCampaign(input: {
    organizationId: string;
    name: string;
    description?: string;
    ownerManagerId: string;
    actorUserId: string;
    memberUserIds?: string[];
  }): Promise<{ id: string; name: string }>;
  assignLeads(input: {
    campaignId: string;
    leadIds: string[];
    allocationMethod: "EQUAL" | "ROUND_ROBIN" | "RANDOM" | "MANUAL";
    manualAssigneeUserId?: string;
    actorUserId: string;
  }): Promise<void>;
}
