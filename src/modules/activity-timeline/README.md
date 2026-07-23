# Activity Timeline Module

First-class, polymorphic activity history for every major entity (Lead, Customer, Loan Application, Loan Account, Call, Document).

Other modules record activity by calling this module's public `RecordActivity` use-case from their own `application/use-cases` right after a domain event occurs. This is an ordinary cross-module call through `index.ts` - it is not a special exception to the module-boundary rule.

**Never put here**: the actual business data owned by an entity (e.g. a call recording's storage URL lives in `telephony`, not duplicated into timeline metadata beyond a reference).
