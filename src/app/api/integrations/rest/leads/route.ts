// ============================================================================
// src/app/api/integrations/rest/leads/route.ts
//
// Authenticated REST intake → Lead Center (FACEBOOK_LEAD_ADS | GOOGLE_ADS | WHATSAPP_BUSINESS).
// Pass sourceCode/source in the JSON body, or set the API key integrationRef to a catalog code.
// Authorization: Bearer mxk_… or raw mxk_… key.
// ============================================================================

import { NextResponse } from "next/server";
import {
  IntegrationAuthError,
  IntegrationCatalogError,
  receiveRestApiLead,
  resolveOrganizationIdForUser,
} from "@/modules/integrations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKeyHeader =
    request.headers.get("authorization") ?? request.headers.get("x-api-key");

  try {
    const result = await receiveRestApiLead({
      apiKeyHeader,
      body,
      organizationIdResolver: resolveOrganizationIdForUser,
    });
    return NextResponse.json({
      ok: true,
      storedCount: result.storedCount,
      duplicateCount: result.duplicateCount,
      invalidCount: result.invalidCount,
      batchId: result.batchId,
    });
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof IntegrationCatalogError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("REST ingest failed", error);
    return NextResponse.json({ error: "REST ingest failed." }, { status: 500 });
  }
}
