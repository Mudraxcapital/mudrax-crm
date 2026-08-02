import type { CallerLeadStageOption } from "@mudrax/types";
import type { LeadStatusFilterKey } from "@/features/leads/store/leadWorkflowStore";

export const LEAD_STATUS_FILTER_OPTIONS: { key: LeadStatusFilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "Fresh", label: "Fresh" },
  { key: "Ringing", label: "Ringing" },
  { key: "Busy", label: "Busy" },
  { key: "Follow Up", label: "Follow Up" },
  { key: "Interested", label: "Interested" },
  { key: "Not Interested", label: "Not Interested" },
  { key: "Won", label: "Won" },
  { key: "Lost", label: "Lost" },
  { key: "Callback", label: "Callback" },
  { key: "Invalid Number", label: "Invalid Number" },
  { key: "No Answer", label: "No Answer" },
];

/** Map UI status labels to possible CRM stage names (seed + common aliases). */
const STAGE_NAME_ALIASES: Record<Exclude<LeadStatusFilterKey, "ALL">, string[]> = {
  Fresh: ["Fresh"],
  Ringing: ["Ringing"],
  Busy: ["Busy"],
  "Follow Up": ["Follow Up", "Follow-up Scheduled"],
  Interested: ["Interested"],
  "Not Interested": ["Not Interested", "No Need"],
  Won: ["Won"],
  Lost: ["Lost"],
  Callback: ["Callback", "Callback Requested"],
  "Invalid Number": ["Invalid Number", "Invalid"],
  "No Answer": ["No Answer", "Not Reachable"],
};

export function resolveStageIdForStatusFilter(
  status: LeadStatusFilterKey,
  stages: CallerLeadStageOption[],
): string | null {
  if (status === "ALL") return null;
  const aliases = STAGE_NAME_ALIASES[status].map((name) => name.toLowerCase());
  const match = stages.find((stage) => aliases.includes(stage.name.toLowerCase()));
  return match?.id ?? null;
}

export function extractPriority(
  fieldValues?: { internalKey: string; displayValue: string | null }[] | null,
): string | null {
  if (!fieldValues?.length) return null;
  const priority = fieldValues.find((field) => field.internalKey === "priority");
  const value = priority?.displayValue?.trim();
  return value || null;
}
