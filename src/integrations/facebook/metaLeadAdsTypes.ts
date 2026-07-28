// ============================================================================
// src/integrations/facebook/metaLeadAdsTypes.ts
//
// Meta (Facebook) Lead Ads webhook + Graph API shapes. Protocol-only types.
// ============================================================================

export interface MetaWebhookPayload {
  object?: string;
  entry?: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id?: string;
  time?: number;
  changes?: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  field?: string;
  value?: {
    leadgen_id?: string;
    page_id?: string;
    form_id?: string;
    ad_id?: string;
    adgroup_id?: string;
    created_time?: number;
  };
}

export interface MetaLeadField {
  name: string;
  values: string[];
}

export interface MetaLeadGraphResponse {
  id?: string;
  created_time?: string;
  ad_id?: string;
  form_id?: string;
  field_data?: MetaLeadField[];
  error?: { message?: string; type?: string; code?: number };
}

export interface MetaLeadgenEvent {
  leadgenId: string;
  pageId: string | null;
  formId: string | null;
  adId: string | null;
  createdTime: number | null;
}
