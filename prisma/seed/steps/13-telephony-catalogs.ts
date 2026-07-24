// ============================================================================
// prisma/seed/steps/13-telephony-catalogs.ts
//
// Seeds the `telephony` module's one admin-configurable catalog: Call
// Outcome (docs/modules/telephony.md — "Call outcomes must be configurable",
// never a hardcoded enum). Permanently distinct from the system-detected
// `CallDisposition` enum and from `leads`' Call Feedback Status (ADR 0006).
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { explain, section, summary } from "../lib/logger";

export interface TelephonyCatalogSeedResult {
  callOutcomeIds: Record<string, string>;
}

const CALL_OUTCOMES: { name: string; sortOrder: number }[] = [
  { name: "Interested", sortOrder: 1 },
  { name: "Not Interested", sortOrder: 2 },
  { name: "Call Back Later", sortOrder: 3 },
  { name: "Wrong Number", sortOrder: 4 },
  { name: "Do Not Call", sortOrder: 5 },
  { name: "Converted", sortOrder: 6 },
];

export async function seedTelephonyCatalogs(
  prisma: PrismaClient,
  organizationId: string,
): Promise<TelephonyCatalogSeedResult> {
  section("13. Telephony module catalogs");

  explain(
    "Call Outcome — admin-configurable business outcome an Agent records against a Call Attempt; permanently distinct from the system-detected Call Disposition enum (ADR 0006).",
  );
  const callOutcomeIds: Record<string, string> = {};
  for (const outcome of CALL_OUTCOMES) {
    const row = await prisma.callOutcome.upsert({
      where: { organizationId_name: { organizationId, name: outcome.name } },
      update: { sortOrder: outcome.sortOrder },
      create: { organizationId, name: outcome.name, sortOrder: outcome.sortOrder },
    });
    callOutcomeIds[outcome.name] = row.id;
  }

  summary("Call Outcomes", CALL_OUTCOMES.length);

  return { callOutcomeIds };
}
