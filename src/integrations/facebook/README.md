# integrations/facebook

Meta (Facebook) Lead Ads webhook + Graph API adapter.

Feeds **Lead Center** (`FACEBOOK_LEAD_ADS`) via the `integrations` module —
never writes Campaign Leads directly.

## Callback URL

Configure in Meta App → Webhooks → Page → `leadgen`:

```
{APP_URL}/api/integrations/meta/webhook
```

Use the **Verify token** saved on the Facebook Lead Ads connection in
Integrations (or `META_VERIFY_TOKEN` / connection config).

## Required Meta setup

1. Meta App with **Webhooks** + **pages** / Lead Ads permissions.
2. Page subscribed to `leadgen`.
3. Long-lived **Page access token** with `leads_retrieval` (and related) scopes.
4. In CRM **Integrations → Facebook Lead Ads**: Enable → save Page ID, verify
   token, page access token, and (recommended) App secret for signature checks.

## Env fallbacks (optional)

```
META_APP_SECRET=
META_VERIFY_TOKEN=
META_PAGE_ACCESS_TOKEN=
META_GRAPH_API_VERSION=v21.0
```

Prefer storing tokens in the Integrations connection config for the org.
