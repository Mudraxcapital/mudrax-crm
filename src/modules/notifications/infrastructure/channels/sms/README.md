# infrastructure/channels/sms

Implements `INotificationChannel` by delegating to `src/integrations/sms`.

**Never put here**: business rules about *when* to notify - that belongs in `application/use-cases`.
