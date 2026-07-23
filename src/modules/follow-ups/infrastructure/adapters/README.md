# infrastructure/adapters

Concrete implementations of this module's `application/ports` (e.g. calling a shared integration in `src/integrations/*`).

**Never put here**: business rules — adapters only translate between an external system and this module's port interfaces.
