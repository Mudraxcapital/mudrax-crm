# Lead Center

## Purpose

Staging area for inbound leads from **Facebook Lead Ads**, **Google Ads**, and
**WhatsApp Business**. Leads become Campaign Leads only after an explicit import
into a Campaign.

Does **not** replace All Leads, Pipeline, Add from Excel, or Duplicate Detection.

## Key Entities

- `StagedLead` - inbound lead awaiting review / import (not a Campaign Lead).
- `LeadCenterSourceBucket` - Facebook / Google / WhatsApp channel grouping.
- `IngestionBatch` - auditable unit of one connector receive.

## Product surface

Sources: `FACEBOOK_LEAD_ADS`, `GOOGLE_ADS`, `WHATSAPP_BUSINESS` only.

Campaign import chooses a **source scope**: Facebook, Google, WhatsApp, or all
three → Preview → Existing or new Campaign → `createCustomer` / `createLead` →
optional `assignCampaignLeads`.

CSV upload and bulk staged-lead operations are not part of this surface.

## Business Rules

- External connectors never write `leads.Lead` or Campaign assignment directly.
- Every source uses the same Lead Ingestion Pipeline; only the connector differs.
- Campaign import reuses `leads` public APIs (`createLead`, assignment) and
  `campaigns` allocation (`assignCampaignLeads`).
- Existing `/leads/import` (Add from Excel) remains unchanged.
- Callers have no Lead Center access.

## Who Can Do What

| Role | Capability |
| --- | --- |
| Admin | Full Lead Center access |
| Manager | View and import; create campaigns if granted |
| Team Lead | View if granted; import only into campaigns they own/manage |
| Caller | No access |

## Dependencies

- `leads` — Campaign Lead creation, duplicate classification helpers
- `campaigns` — create campaign, assign leads
- `customers` — identity resolution on import
- `rbac` — `lead_center.view` / `lead_center.manage` / `lead_center.import`
- `integrations` — connector configuration (no lead display)
