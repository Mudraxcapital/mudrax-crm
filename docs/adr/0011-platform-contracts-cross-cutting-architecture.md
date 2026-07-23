# 0011 — Platform Contracts: Cross-Cutting Architecture

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-07-24 |

## Context

Organization (ADR 0003), CRM Core (ADR 0004), Loan Management (ADR 0005),
Telephony & Call Center (ADR 0006), Document Management (ADR 0007),
Notifications & Communications (ADR 0008), Reports & Analytics (ADR 0009),
and AI Platform (ADR 0010) are accepted and are not revisited by this
decision. Across all eight, several concerns kept recurring independently
rather than being defined once, centrally:

1. **Events are relied on everywhere, but never formally specified.**
   `campaigns -> leads`, `* -> notifications` (Event Trigger Subscription,
   ADR 0008), `* -> ai-platform` (AI Trigger Subscription, ADR 0010), and
   `* -> reports` all depend on "a domain event" without this codebase ever
   defining what an event's envelope contains, how it is named or
   versioned, what "idempotent" or "ordered" mean here, or what happens when
   delivery fails.
2. **Append-only "audit" has been independently reinvented three times**
   with the same wording each time — Audit Trail (`documents`, ADR 0007),
   Communication Log (`notifications`, ADR 0008), and AI Audit Log
   (`ai-core`, ADR 0010) — with no single named contract tying them
   together, risking a fourth, slightly different reinvention the next time
   a module needs one.
3. **"Activity Timeline" has been referenced but never defined.** Rule 8
   already states Webhook Event Log is "not a substitute for Timeline or
   Audit Log," but no document says what a Timeline positively *is*, or how
   it relates to Audit Log and Communication Log.
4. **RBAC (ADR 0002) defines capability but not data scope.** `rbac`
   resolves whether a User may perform a Permission, but this codebase has
   never defined the enterprise vocabulary for *over which records* — a
   gap every module would otherwise fill inconsistently on its own.
5. **"Tenant" and "Organization" were used interchangeably** in a handful of
   already-accepted documents (`ai-platform.md`, ADR 0010,
   `notifications.md`) despite `organization` being the actual, pervasive
   bounded context — a terminology drift with no canonical resolution.
6. **Security/identity handling for PAN and Aadhaar** — already
   load-bearing since `customers`' identity-anchor design (ADR 0004, rule
   9) — has never had an explicit, platform-wide masking/encryption/audit
   contract, leaving each future consumer (Reports export, AI Prompt
   Variables) to invent its own.

Leaving any of these implicit risked the same class of problem this
codebase has structurally avoided at the bounded-context level since ADR
0004: silent, incompatible reinvention of the same cross-cutting concept by
different modules, with no shared vocabulary to catch the drift in review.

## Decision

This ADR defines **platform contracts only** — enterprise-wide rules every
module already follows or must follow identically. It does not create a new
bounded context, does not redesign any of the eight accepted contexts above,
and does not authorize database tables, Prisma models, SQL, APIs, or UI. The
full field-level detail for every contract below is maintained in
[`docs/platform/platform-contracts.md`](../platform/platform-contracts.md).

### Event Platform: one envelope, one set of delivery guarantees, for every publisher

Every module publishes events through one shared **Event Envelope**
(`eventId`, `eventType`, `eventVersion`, `occurredAt`, `source`,
`aggregateType`/`aggregateId`/`aggregateVersion`, `correlationId`,
`causationId`, `actorContext`, `organizationId`, `payload`) — a contract, not
an aggregate, with no owning module. **Event naming** formalizes what ADR
0010 already used informally (`LeadScoreComputed`, `OcrCompleted`):
`<AggregateName><PastTenseVerb>`, PascalCase, with the owning module carried
in the envelope's `source` field rather than the name, so an event's
identity survives a future service extraction (ADR 0001). **Event
versioning** is additive-only within a major version; a breaking change
publishes under a new type name, never an in-place edit — the same
never-edit-a-Version-in-place discipline already applied to Prompt Version,
Commission Policy Version, and Report Template Version. A single
**Correlation ID**, minted only at a genuine trace origin, threads an entire
cross-module business transaction; a **Causation ID** records only the
immediate parent, generalizing AI Platform's `SourceContext`/`conversationId`
idiom (ADR 0010, Open Questions) into a platform-wide rule. Delivery is
always **at-least-once**; every subscriber is responsible for **idempotency**
via `eventId`, generalizing the rule already accepted for Webhook Event Log
and Upload Session. Publication follows the **Outbox Pattern**: an
aggregate's state change and its event record commit as one atomic unit of
work, with publishing to subscribers as a separate relay step. Failed
delivery follows a **Retry Policy** (exponential backoff, bounded attempts,
transient-vs-poison classification) before landing in a per-subscription
**Dead Letter Queue** — the same `Retried -> Dead-lettered` terminal state
already accepted for Webhook Event Log, generalized to every subscription.
**Ordering** is guaranteed only within one aggregate (via `aggregateVersion`);
cross-aggregate ordering is explicitly not guaranteed, and any workflow
needing a strict sequence must implement its own state-machine checks.
**Event retention** is a short, operational replay window, explicitly
decoupled from Audit retention and Document Retention Policy (ADR 0007) —
extending the already-accepted "Retention Policy, Archive, and workflow
state are separate concerns" principle (rule 39) to a fourth case.

### RBAC Data Scope: a fixed enterprise vocabulary layered onto ADR 0002's capability model

ADR 0002 defined *what* a User may do
(`Users -> UserRoles -> Roles -> RolePermissions -> Permissions`). This ADR
adds *over what data*: every `RolePermission` grant carries a **Data Scope**
value — **Self**, **Team**, **Branch**, **Organization**, or **System** —
resolved once, centrally, by `rbac`, the same "resolved once, centrally"
discipline already accepted for Notification Preference's four-layer
resolution (ADR 0008, rule 44). Every module's query/command layer applies
the scope `rbac` returns as a mandatory filter it cannot opt out of, always
evaluated against `organization`'s *current* Team/Branch membership rather
than a snapshot, so a transfer takes effect immediately without
re-authorization — extending ADR 0002/`organization.md`'s "transfers
preserve identity without redefining Permissions" principle to scope as well
as capability. **System** scope is reserved for individually named,
individually justified platform/technical grants (Provider configuration,
Audit read access), never a blanket bypass.

### Security & Identity: masking, encryption, hashing, secrets, and rotation as explicit platform rules

PAN and Aadhaar — already load-bearing identity anchors (ADR 0004, rule 9) —
are masked by default everywhere displayed, encrypted at rest, and must
never cross a module boundary unmasked in an event payload, a log, an
exported Analytics Dataset (ADR 0009), or an AI Prompt Variable — extending
ADR 0010's "a PII-flagged Prompt Variable is always redacted before leaving
the AI Platform boundary" rule to every boundary crossing, not only AI's.
Aadhaar carries stricter handling again (never logged, never sent to an
external AI Provider unmasked). Encryption (reversible) and hashing
(irreversible, compare-only) are kept structurally distinct. Every vendor
credential already implied across this codebase (Trunk, Storage Location,
Notification Provider, AI Provider — ADR 0006/0007/0008/0010) is a secret
held in a centralized store, referenced by identifier, never embedded inline
— extending "adapters own the vendor SDK" to "adapters own the vendor
secret." Every secret and key has a defined rotation cadence and a separate
compromise-revocation path. MFA and future SSO are not built now but reserve
an explicit seam on the authentication concern — the same "seam, not full
build" treatment already given to future Consent — so both are additive
configuration later, never a `users`/`rbac` redesign.

### Audit & Immutability: one canonical shape for three already-independent audit records

Audit Trail (`documents`, ADR 0007), Communication Log (`notifications`, ADR
0008), and AI Audit Log (`ai-core`, ADR 0010) already independently
implement the same "structurally append-only, no update/delete use case"
guarantee, worded separately each time. This ADR names that guarantee once
as a platform contract — a canonical field shape (`recordId`, `occurredAt`,
`actor`, `action`, `targetType`/`targetId`, `organizationId`,
`correlationId`, before/after state) every current and future per-module
audit record follows — without creating a new bounded context or moving
ownership away from the modules that already hold it. It adds one genuinely
new requirement beyond what was already accepted: **tamper evidence** via a
hash chain (or periodic signed checkpoint) within each module's own Audit
Trail, so an out-of-band data edit is provably detectable. Audit retention
is explicitly decoupled from Event retention and Document Retention Policy,
retained for the longest applicable regulatory period by default. Even
Admin/System-scope Roles get read-only access to audit data, and viewing an
audit record is itself audited — no Role can silently edit or inspect away
history.

### Organization is the sole canonical term; "tenant" is retired

**Organization** — not "tenant" — is the canonical term platform-wide. It is
already the pervasive, accepted term (the `organization` bounded context;
the Organization-specific-override pattern used identically by Notification
Template, Report Template, Prompt Template, and AI Configuration; Metric
Definition's `Domain` discriminator's `Organization` value), and it matches
this system's actual shape per the BRD: one company, Mudrax Capitals, with
an internal Branch/Region/Team/Department hierarchy — not a multi-tenant
SaaS product partitioning many unrelated client companies. A future need for
multiple legal entities/franchises is still naturally more than one
Organization record inside the same, already-existing bounded context, never
a second competing concept. **Terminology Note:** a handful of
already-accepted documents (`ai-platform.md`, ADR 0010, `notifications.md`,
`domain-model.md`) used "tenant" informally and interchangeably with
Organization; those instances have been corrected to "Organization" as part
of adopting this ADR. This is a pure terminology normalization, not a
decision change, and does not alter any consequence, alternative, or
rationale originally recorded in ADR 0010 or elsewhere.

### Activity Timeline is finally defined, distinct from Audit Log and Communication Log

**Activity Timeline** is a business-facing, human-readable, chronological
*read projection* for one business record, assembled from events (Event
Platform, above) plus each module's own Audit Trail and Communication Log —
answering "what happened to this Lead, in order, for the person working
it." **Audit Log/Audit Trail** is the compliance system of record — answering
"prove exactly what happened, who did it, and when." **Communication Log**
is the specialized, append-only record of communications only (ADR 0008).
Timeline is a derived projection built from the other two; it never
replaces either — resolving what rule 8's "not a substitute for Timeline or
Audit Log" language has referenced without definition since it was written.

### Consent: Operational vs. Marketing confirmed, extended for future purposes

**Operational Consent** is the implicit permission already governed by
Notification Preference/Category logic (Transactional/OTP always deliver,
ADR 0008) — a service obligation, never gated by Consent. **Marketing
Consent** is exactly the future Consent entity already scoped in
`domain-model.md` (`Requested -> Granted -> Withdrawn / Expired /
Superseded`), confirmed here as the single legal-evidence layer for
Marketing eligibility platform-wide — `campaigns`' Broadcast sends resolve
through the same centralized check, never a parallel campaign-specific
opt-in. Future extensibility (Bank data-sharing consent, credit-bureau pull
consent, AI-processing consent) is via new `ConsentPurpose` discriminator
values — the same discriminator-generalization discipline already used for
Metric Definition's `Domain` — never new parallel entities per purpose.

### Cross-cutting naming conventions are made explicit

Provider abstractions (`<Capability> Provider` + `<Capability>ProviderType` +
`I<Capability>ProviderAdapter`), Version entities (`Draft -> Published`,
never edited in place), the `Stage` vs. `Status` distinction, Event naming
(above), and Aggregate naming (Title Case business nouns, with the
intent/execution split pattern already used four times — Loan
Application/Loan Account, Call/Call Attempt, Notification/Notification
Delivery, Report/Report Execution, AI Task/AI Job) are recorded once as the
standing conventions every future module and ADR follows, rather than being
re-derived independently each time.

## Consequences

- Every future module gets events, audit, RBAC scope, PII handling, and
  naming for free, by following one shared contract, instead of inventing
  its own variant the way `documents`, `notifications`, and `ai-core` each
  independently arrived at the same "append-only audit" shape.
- A cross-module incident or compliance investigation can be fully traced
  via `correlationId`/`causationId` regardless of how many modules a
  business transaction passed through.
- RBAC authorization checks are now unambiguous about *which records* a
  Permission applies to, closing a gap ADR 0002 intentionally left open for
  this ADR to fill.
- PAN/Aadhaar handling has one explicit, citable rule set instead of being
  re-decided ad hoc the first time Reports or AI Platform needed to touch
  either field.
- "Tenant" no longer competes with "Organization" anywhere in this
  codebase's documentation.
- "Timeline" now has a positive definition distinct from Audit Log and
  Communication Log, closing a gap rule 8 left open since it was written.
- No existing bounded context's ownership, aggregate boundary, or lifecycle
  changes as a result of this ADR.

## Alternatives Considered

- **Let each module keep defining its own event shape, audit shape, and
  masking rule independently**: rejected — this is the exact drift already
  observed three times (Audit Trail, Communication Log, AI Audit Log) and
  would only get worse as more modules are added.
- **Create a new "Platform" or "Audit" bounded context to centralize audit
  ownership**: rejected — the task explicitly forbids inventing new bounded
  contexts, and centralizing ownership is unnecessary; a shared *contract*
  achieves the same consistency without taking audit ownership away from
  the module that generates it, which would also reintroduce the exact
  two-writer risk this codebase has avoided since ADR 0004.
- **Adopt "Tenant" as the canonical term instead of "Organization"**:
  rejected — "tenant" implies a multi-tenant SaaS shape this system does not
  have (one company, per the BRD), and "Organization" was already the
  dominant, accepted term everywhere else.
- **Leave RBAC Data Scope undefined and let each module invent its own
  scope filters**: rejected — guaranteed inconsistent enforcement (e.g. one
  module scoping "Branch" to include sub-Branches, another not) with no
  central authority to catch the mismatch.
- **Defer PAN/Aadhaar platform-wide masking rules until Reports/AI Platform
  actually need them**: rejected — both ADR 0009 and ADR 0010 already
  reference PII/PAN handling indirectly (Dataset export, Prompt Variable
  redaction); leaving the rule undefined until the first real violation is
  strictly worse than stating it now.

## Terminology Note

As part of adopting this ADR, informal "tenant" language in
`docs/modules/ai-platform.md`, `docs/modules/notifications.md`,
`docs/adr/0010-ai-platform-intelligence-governance-and-provider-abstraction.md`,
and `docs/domain/domain-model.md` was corrected to "Organization." This is a
documentation-only terminology normalization consistent with those
documents' original decisions and rationale — no consequence, alternative,
or aggregate boundary recorded in ADR 0010 or any other prior ADR was
altered.

## Open Questions

- Whether the Event Envelope and Audit Record shapes should eventually be
  expressed as a shared, versioned schema definition (outside this
  documentation layer) once implementation begins — deferred to
  implementation planning, out of scope for this architecture-only ADR.
- Whether tamper-evidence checkpoints (section 4) should be externalized to
  a third-party timestamping service or an internal independent store —
  deferred until Audit & Immutability moves from architecture to
  implementation.
- Whether a sixth RBAC Data Scope value (e.g. **Region**, sitting between
  Branch and Organization, mirroring `organization`'s existing Region
  entity) is needed once Regional Manager-level reporting is scoped in
  detail — deferred until that Role is actually prioritized.

This ADR defines architecture only. It does not authorize database tables,
Prisma models, SQL, APIs, or UI.
