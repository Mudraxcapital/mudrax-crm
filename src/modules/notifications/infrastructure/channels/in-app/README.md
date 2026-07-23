# infrastructure/channels/in-app

Implements `INotificationChannel` by writing to the DB and pushing via `src/infra/realtime`.

**Never put here**: business rules about *when* to notify - that belongs in `application/use-cases`.
