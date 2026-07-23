# Integrations

Plugin-based external system connectors. Each folder is fully isolated and implements a port interface owned by whichever module consumes it (e.g. `whatsapp/adapter.ts` implements the `notifications` module's `INotificationChannel`; `telephony/asterisk/adapter.ts` implements the `telephony` module's `ITelephonyProvider`).

Living outside `src/modules/` keeps integrations genuinely shared across multiple modules without breaking the 'modules only talk through public APIs' rule.

**Never put here**: business rules or persistence - an integration folder only translates between an external protocol/API and the internal port interface it implements.
