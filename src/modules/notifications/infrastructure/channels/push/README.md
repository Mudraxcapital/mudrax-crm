# infrastructure/channels/push

Implements `INotificationChannel` via web push / FCM.

**Never put here**: business rules about *when* to notify - that belongs in `application/use-cases`.
