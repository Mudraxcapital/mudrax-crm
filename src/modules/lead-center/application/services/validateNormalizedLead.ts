// ============================================================================
// src/modules/lead-center/application/services/validateNormalizedLead.ts
// ============================================================================

import type { NormalizedInboundLead } from "./normalizeInboundLead";

export interface ValidatedInboundLead extends NormalizedInboundLead {
  validationStatus: "VALID" | "INVALID";
  validationErrors: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNormalizedLead(lead: NormalizedInboundLead): ValidatedInboundLead {
  const errors: string[] = [];

  if (!lead.fullName || lead.fullName.length < 2) {
    errors.push("Full name is required (min 2 characters).");
  }
  if (lead.fullName.length > 200) {
    errors.push("Full name must be at most 200 characters.");
  }

  if (!lead.phone && !lead.email) {
    errors.push("At least one of phone or email is required.");
  }
  if (lead.phone && lead.phone.length < 7) {
    errors.push("Phone number looks too short.");
  }
  if (lead.phone && lead.phone.length > 15) {
    errors.push("Phone number looks too long.");
  }
  if (lead.email && !EMAIL_RE.test(lead.email)) {
    errors.push("Email format is invalid.");
  }

  return {
    ...lead,
    validationStatus: errors.length === 0 ? "VALID" : "INVALID",
    validationErrors: errors,
  };
}

export function validateNormalizedLeads(
  leads: NormalizedInboundLead[],
): ValidatedInboundLead[] {
  return leads.map(validateNormalizedLead);
}
