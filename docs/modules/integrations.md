# Integrations

## Purpose

Configuration-only module for Facebook Lead Ads (Meta), Google Ads Lead Forms, and
WhatsApp Business. No leads are listed or edited here.

Protocol adapters remain under `src/integrations/*`. This module owns
enablement, field mappings, webhook registration, and credential references.

## Key Entities

- `IntegrationConnection` - enabled connector instance for the organization.
- `FieldMapping` - external payload → Lead Center normalized fields.
- `WebhookEndpoint` - inbound webhook registration and secrets.

## Business Rules

- Connectors push normalized payloads into the Lead Center ingestion pipeline.
- Adding a future integration requires a connector + field mapping only.
- Does not display, edit, or delete leads.

## Who Can Do What

| Role | Capability |
| --- | --- |
| Admin | Full configuration |
| Manager | Configure if granted (`integration.manage`) |
| Team Lead | No integration configuration |
| Caller | No access |

## Product surface

- Catalog: `facebook_lead_ads` (available), `google_ads_lead_forms`, `whatsapp_business`
- **Meta Lead Ads**: enable connection → save Page ID / verify token / page access
  token / app secret → Meta webhook
  `{APP_URL}/api/integrations/meta/webhook` → Graph API lead fetch → Lead Center
  (`FACEBOOK_LEAD_ADS`)
- Intake never writes Campaign Leads directly
