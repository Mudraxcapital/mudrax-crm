# Architecture Decision Records (ADR)

Short, numbered documents recording *why* a significant architecture decision was made — critical for a system meant to survive 10 years and multiple engineering teams.

## Convention

- File name: `NNNN-short-title.md` (four-digit, zero-padded, sequential).
- Each ADR should cover: Context, Decision, Consequences, and Alternatives Considered.
- Once accepted, an ADR is not edited to reflect new decisions — a new ADR supersedes it and references the old one.

## Index

| # | Title | Status |
| --- | --- | --- |
| [0001](0001-modular-monolith-and-clean-architecture.md) | Modular Monolith with Clean Architecture | Accepted |
| [0002](0002-users-and-enterprise-rbac.md) | Users and Enterprise RBAC | Accepted |
| [0003](0003-organization-and-campaign-bounded-contexts.md) | Organization and Campaign Bounded Contexts | Accepted (amended by 0004) |
| [0004](0004-crm-core-customer-identity-and-lead-ownership.md) | CRM Core: Customer Identity, Lead Ownership, and Campaign/Reports Boundaries | Accepted |
| [0005](0005-loan-management-aggregate-boundaries-and-lifecycle.md) | Loan Management: Aggregate Boundaries and Lifecycle | Accepted |
| [0006](0006-telephony-call-center-aggregate-boundaries.md) | Telephony & Call Center: Aggregate Boundaries and Provider Abstraction | Accepted |
| [0007](0007-document-management-aggregate-boundaries-and-storage-abstraction.md) | Document Management: Aggregate Boundaries, Storage Abstraction, and Document Bundles | Accepted |
| [0008](0008-notifications-communications-aggregate-boundaries-and-provider-abstraction.md) | Notifications & Communications: Aggregate Boundaries and Provider Abstraction | Accepted |
| [0009](0009-reports-and-analytics-aggregate-boundaries-and-dataset-abstraction.md) | Reports & Analytics: Aggregate Boundaries and Dataset/BI Abstraction | Accepted |
| [0010](0010-ai-platform-intelligence-governance-and-provider-abstraction.md) | AI Platform: Intelligence Layer, Governance, and Provider Abstraction | Accepted |
