# infrastructure/channels/whatsapp

Implements `INotificationChannel` by delegating to `src/integrations/whatsapp`.

**Never put here**: business rules about *when* to notify - that belongs in `application/use-cases`.
