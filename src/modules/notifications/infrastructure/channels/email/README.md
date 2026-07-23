# infrastructure/channels/email

Implements `INotificationChannel` via an email transport.

**Never put here**: business rules about *when* to notify - that belongs in `application/use-cases`.
