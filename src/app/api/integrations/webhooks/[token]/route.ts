// ============================================================================
// src/app/api/integrations/webhooks/[token]/route.ts
//
// Public inbound webhook → Lead Center ingestion. Auth via X-Webhook-Secret.
// ============================================================================

import { NextResponse } from "next/server";
import {
  IntegrationAuthError,
  IntegrationCatalogError,
  receiveWebhookLead,
  WebhookEndpointNotFoundError,
} from "@/modules/integrations";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const secret =
    request.headers.get("x-webhook-secret") ??
    request.headers.get("X-Webhook-Secret");

  try {
    const result = await receiveWebhookLead({
      pathToken: token,
      secretHeader: secret,
      body,
    });
    return NextResponse.json({
      ok: true,
      storedCount: result.storedCount,
      duplicateCount: result.duplicateCount,
      invalidCount: result.invalidCount,
      batchId: result.batchId,
    });
  } catch (error) {
    if (error instanceof WebhookEndpointNotFoundError) {
      return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
    }
    if (error instanceof IntegrationAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof IntegrationCatalogError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("webhook ingest failed", error);
    return NextResponse.json({ error: "Webhook ingest failed." }, { status: 500 });
  }
}
