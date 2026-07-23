# Notifications Module

Channel-based outbound notifications behind a single `INotificationChannel` port. Adding a future channel (Telegram, Slack, a voice-call alert) means adding one new folder under `infrastructure/channels/` that implements the port - zero changes to `domain/` or `application/`.

**Never put here**: channel-specific vendor logic beyond translation - the `sms`/`whatsapp` channels are thin wrappers that call `src/integrations/sms` and `src/integrations/whatsapp` respectively.
