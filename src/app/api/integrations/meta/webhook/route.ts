// ============================================================================
// src/app/api/integrations/meta/webhook/route.ts
//
// Public Meta (Facebook) Lead Ads webhook.
// GET  — subscription verification (hub.challenge)
// POST — leadgen notifications → Graph fetch → Lead Center
// ============================================================================

import { NextResponse } from "next/server";
import { getCompanyId } from "@/infra/company/getCompanyId";
import {
  IntegrationAuthError,
  IntegrationCatalogError,
  receiveMetaLeadAds,
  verifyMetaLeadAdsWebhook,
} from "@/modules/integrations";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const organizationId = await getCompanyId();
    const challenge = await verifyMetaLeadAdsWebhook({
      organizationId,
      mode: url.searchParams.get("hub.mode"),
      verifyToken: url.searchParams.get("hub.verify_token"),
      challenge: url.searchParams.get("hub.challenge"),
    });
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    if (error instanceof IntegrationAuthError || error instanceof IntegrationCatalogError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("meta webhook verify failed", error);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const signature =
    request.headers.get("x-hub-signature-256") ??
    request.headers.get("X-Hub-Signature-256");

  try {
    const organizationId = await getCompanyId();
    const result = await receiveMetaLeadAds({
      organizationId,
      rawBody,
      signatureHeader: signature,
      payload,
    });
    return NextResponse.json({
      ok: true,
      storedCount: result.storedCount,
      duplicateCount: result.duplicateCount,
      invalidCount: result.invalidCount,
      batchId: result.batchId,
      processed: result.processed,
      skipped: result.skipped,
    });
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof IntegrationCatalogError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("meta lead ads ingest failed", error);
    return NextResponse.json({ error: "Meta lead ingest failed." }, { status: 500 });
  }
}
