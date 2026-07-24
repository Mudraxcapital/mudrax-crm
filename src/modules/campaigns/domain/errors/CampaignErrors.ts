// ============================================================================
// src/modules/campaigns/domain/errors/CampaignErrors.ts
//
// Domain errors for the Campaign aggregate's use-cases.
// ============================================================================

export class CampaignNotFoundError extends Error {
  constructor(id: string) {
    super(`Campaign ${id} was not found.`);
    this.name = "CampaignNotFoundError";
  }
}

export class InvalidCampaignStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Campaign cannot move from status ${from} to ${to}.`);
    this.name = "InvalidCampaignStatusTransitionError";
  }
}

export class InvalidMemberReferenceError extends Error {
  constructor(userId: string) {
    super(
      `User ${userId} was not found in this Organization; only an existing, active User can join a Campaign.`,
    );
    this.name = "InvalidMemberReferenceError";
  }
}

export class CampaignMembershipNotFoundError extends Error {
  constructor(campaignId: string, userId: string) {
    super(`User ${userId} is not a member of Campaign ${campaignId}.`);
    this.name = "CampaignMembershipNotFoundError";
  }
}

export class NoActiveMembersError extends Error {
  constructor(campaignId: string) {
    super(`Campaign ${campaignId} has no active members to allocate Leads to.`);
    this.name = "NoActiveMembersError";
  }
}

export class InvalidAllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAllocationError";
  }
}

export class InvalidLeadReferenceError extends Error {
  constructor(leadId: string) {
    super(
      `Lead ${leadId} was not found; only existing Leads in this Organization can be allocated.`,
    );
    this.name = "InvalidLeadReferenceError";
  }
}
