# Documentation

- `adr/` - Architecture Decision Records: short, numbered docs recording *why* a significant decision was made.
- `domain/` - accepted bounded-context ownership and enterprise domain-model documentation.
- `modules/` - one doc per business module explaining domain rules in plain language.
- `platform/` - enterprise-wide, cross-cutting platform contracts (events, RBAC data scope, security & identity, audit) that every module follows identically. See [ADR 0011](adr/0011-platform-contracts-cross-cutting-architecture.md).
- `business/` - business requirements and stakeholder-facing documents.
