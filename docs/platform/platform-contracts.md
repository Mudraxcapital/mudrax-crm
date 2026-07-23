# Platform Contracts

Enterprise-wide, cross-cutting contracts that every bounded context — CRM
Core, Loan Management, Telephony, Document Management, Notifications,
Reports & Analytics, and AI Platform — must follow identically. This
document is the detailed companion to
[ADR 0011](../adr/0011-platform-contracts-cross-cutting-architecture.md); the
ADR records *why* these contracts exist, this document records their full
shape.

This is an architecture artifact only. It does not define database tables,
Prisma models, SQL, APIs, or UI. It does not redesign, replace, or add any
bounded context — every module referenced below keeps the ownership already
recorded in its own ADR and in
[`docs/domain/domain-model.md`](../domain/domain-model.md).

---

## 1. Event Platform

Every module that publishes a domain event — the mechanism already relied on
by `campaigns -> leads`, `* -> notifications` (Event Trigger Subscription,
ADR 0008), `* -> ai-platform` (AI Trigger Subscription, ADR 0010), and
`* -> reports` — does so through one shared envelope and one shared set of
delivery guarantees, defined here for the first time as an explicit,
platform-wide contract instead of being assumed independently by each
consumer.

### Event Envelope

| Field | Responsibility |
| --- | --- |
| `eventId` | Globally unique, immutable identity of this one occurrence — doubles as the idempotency key. |
| `eventType` | The event name (see Naming below), e.g. `LeadScoreComputed`. |
| `eventVersion` | Schema version of this event type's payload (see Versioning). |
| `occurredAt` | When the fact became true in the business — not when it was published or delivered. |
| `source` | The owning module that produced the event (e.g. `leads`, `ai-core`), disambiguating without polluting the event name. |
| `aggregateType` / `aggregateId` | The one aggregate this event is a fact about. |
| `aggregateVersion` | Sequence number of the aggregate at the time of this event — the anchor for ordering and idempotency checks (see Ordering). |
| `correlationId` | Ties this event to the entire business transaction/saga it belongs to (see Correlation ID). |
| `causationId` | The `eventId` (or command id) that directly produced this event (see Causation ID). |
| `actorContext` | `{ actorType: User \| System \| AI, actorId }` — the same discriminator idiom already used for `SourceContext` (ADR 0010) and `OwnerContext` (ADR 0007). |
| `organizationId` | The Organization scope this event belongs to (see [RBAC Data Scope](#2-rbac-data-scope) and [Organization Terminology](#5-organization-terminology)). |
| `payload` | Type-specific, versioned fact data. |

No module invents its own envelope variant; this shape is a shared platform
contract, not an aggregate, and has no owning module — the same way "Clean
Architecture layering" (ADR 0001) has no owning module.

### Event Naming

`<AggregateName><PastTenseVerb>`, PascalCase, no punctuation, and — critically
— no module prefix baked into the name itself. This formalizes the naming
already used informally in ADR 0010/`ai-platform.md` (`LeadScoreComputed`,
`OcrCompleted`, `CallSummaryGenerated`, `AnomalyFlagged`): the owning module
lives in the envelope's `source` field, so an event's name never has to
change if a module is later extracted into its own service — the exact
extraction path ADR 0001 explicitly leaves open.

### Event Versioning

`eventVersion` is independent of any aggregate's own Version-entity concept
(Prompt Version, Commission Policy Version, Report Template Version, etc.).
Within one major version, changes are additive-only — new optional fields;
every consumer is a tolerant reader that ignores unknown fields. A breaking
payload change never mutates an existing `eventType` in place; it publishes
under a new, explicitly suffixed type name (e.g. `LoanApplicationApprovedV2`)
— the identical "never edit a Version in place, always create a new one"
discipline already accepted for Prompt Version, Commission Policy Version,
and Report Template Version, applied here to event schemas.

### Correlation ID

One `correlationId` is minted only at a genuine trace origin — an inbound
user action, an inbound provider webhook already logged in Webhook Event
Log, or a scheduled/system-initiated job — and propagated unchanged through
every command and event it causes, across every module boundary, for the
life of that business transaction. This generalizes the AI Platform's
`SourceContext`/`conversationId` correlation idiom (ADR 0010, Open
Questions) into a platform-wide rule, so a support or compliance
investigation can reconstruct one full cross-module story (e.g. Lead ->
Follow-up -> Notification -> AI Task) from a single id. `correlationId` is
mandatory and non-nullable on every event; it is never silently omitted.

### Causation ID

`causationId` is the immediate parent — the `eventId` or command id that
directly produced this event — forming a causation *chain*, distinct from
`correlationId`, which is the constant thread through an entire saga. An
event at the root of a chain sets `causationId` to the originating command's
id, never leaves it empty.

### Idempotency

Delivery is always assumed **at-least-once, never exactly-once**. Every
consumer (every Event Trigger Subscription, AI Trigger Subscription, or
future subscription type) must record `eventId`s it has already acted on and
treat replays as no-ops. This generalizes the rule already accepted for
Webhook Event Log ("provider event IDs must be idempotent") and Upload
Session ("idempotent by session token") into one platform-wide guarantee
every subscriber honors identically. The idempotency dedupe window is bounded
to the Event Retention period below — a replay older than retention is
rejected/logged, never silently reprocessed forever.

### Outbox Pattern

An aggregate's own state change and the recording of the event describing
that change happen as one atomic unit of work; publishing the recorded event
outward to subscribers is a separate, asynchronous relay step. This
guarantees an event is never lost because a state change succeeded while
publishing failed, and never observed by a subscriber before the state it
describes is durably committed.

### Retry Policy

Exponential backoff with jitter; a configurable, per-subscription maximum
attempt count; an explicit distinction between transient failures (retry)
and poison/permanent failures (fail fast to the Dead Letter Queue). Every
retry attempt is itself visible and auditable, never silent.

### Dead Letter Queue

After retries are exhausted, an event moves to a per-subscription dead
letter queue carrying its full attempt history and failure reason — the
same `Retried -> Dead-lettered` terminal state already accepted for Webhook
Event Log, generalized here into the standing rule for every subscription,
not only inbound webhooks. A dead-lettered event always requires human/admin
triage; it is never silently dropped.

### Ordering Guarantees

Ordering is guaranteed **only within one aggregate**, via `aggregateVersion`
— a subscriber can detect and reject/reorder an out-of-sequence delivery for
the same `aggregateId`. Ordering **across different aggregates or modules is
explicitly not guaranteed.** Any workflow needing a strict cross-aggregate
sequence (e.g. Campaign Assignment -> Lead update -> Notification) must
implement its own explicit state-machine/precondition checks rather than
assume delivery order — the same discipline the AI lifecycle already applies
with its Safety Policy/AutomationTier gating checks (ADR 0010).

### Event Retention

Event-bus retention is a purely operational/technical concern (a bounded
replay window for reprocessing, debugging, and DLQ triage) and is
**explicitly decoupled** from Audit retention
([section 4](#4-audit--immutability)) and from Document Retention Policy
(ADR 0007). This extends the already-accepted principle that "Retention
Policy, Archive, and workflow state are three permanently separate concerns"
(rule 39) to a fourth, previously undefined case: a transient integration
event is not the business's permanent record of what happened — the owning
module's own Audit Trail/Audit Log is.

---

## 2. RBAC Data Scope

ADR 0002 established *what* a User may do
(`Users -> UserRoles -> Roles -> RolePermissions -> Permissions`). This
section defines *over what data* that capability applies. Every
`RolePermission` grant carries, alongside its atomic Permission, a **Data
Scope** value from one fixed enterprise vocabulary:

| Scope | Boundary | Typical holder |
| --- | --- | --- |
| **Self** | Only records the acting User owns or is directly assigned to (own Leads, own Follow-ups, own Call Attempts). | Caller |
| **Team** | Records belonging to any User who is a member of the same Team (per `organization`'s Team entity) as the acting User. | Team Leader |
| **Branch** | Records belonging to any Team/User under the same Branch (per `organization`'s Branch/Region hierarchy). | Branch Manager |
| **Organization** | All records belonging to the acting User's Organization, regardless of Branch/Team. | Senior Manager/Admin |
| **System** | Platform/technical scope not bound to business-record ownership — Provider/Integration configuration, AI Platform governance, Audit Trail read access, impersonation. | Explicitly named, individually justified grants only |

### How every module applies Data Scope

Data Scope is resolved **once, centrally, by `rbac`** — the same
"resolved once, centrally, never re-derived per module" discipline already
accepted for Notification Preference's four-layer resolution (ADR 0008,
rule 44). A module's query/command layer receives an already-resolved scope
boundary from `rbac`'s public API and applies it as a mandatory filter it
cannot opt out of; modules never re-implement their own scope logic and
never expose an unscoped bypass path. Scope resolution always reads
`organization`'s **current** Team/Branch membership at check time (or a
short-TTL, explicitly invalidated cache) — never a value snapshotted onto
the User/Role record — so a Branch transfer takes effect immediately without
re-authorization, extending ADR 0002/`organization.md`'s existing "transfers
preserve identity without redefining Permissions" principle to scope as well
as capability.

---

## 3. Security & Identity

| Concern | Contract |
| --- | --- |
| **PAN handling** | Masked by default everywhere displayed (last 4 characters only) except to a Role holding an explicit unmask Permission; encrypted at rest; every unmasked-view access is Audit-logged; never leaves a module boundary in plaintext — not in an event payload, a log line, an exported Analytics Dataset (ADR 0009), or an AI Prompt Variable. |
| **Aadhaar handling** | Treated as more sensitive than PAN (Aadhaar Act): masked-by-default (last 4 digits), full value held only in an encrypted vault; never logged; never sent to any external AI Provider unmasked; never included in an exported Report/Analytics Dataset; access requires its own explicit Permission, audited distinctly from general Customer-record access. |
| **Encryption** | Two tiers, kept structurally separate: transport encryption (TLS everywhere, including internal calls) and at-rest encryption for designated sensitive fields (PAN, Aadhaar, provider secrets, recorded call audio, uploaded Documents) — applied at the storage/provider adapter layer, mirroring Document Management's storage abstraction (ADR 0007), never duplicated ad hoc per module. |
| **Hashing** | Reserved for values only ever *compared*, never displayed or decrypted — password hashes (modern adaptive algorithm) and irreversible lookup hashes for deduplication (e.g. matching two Aadhaar numbers without decrypting either). Hashing (irreversible) and encryption (reversible) are never substituted for one another. |
| **Secrets Management** | Every provider credential already implied across this codebase (Telephony Trunk, Storage Location, Notification Provider, AI Provider — ADR 0006/0007/0008/0010) is a secret: held in a centralized secrets store, referenced by identifier from the owning configuration entity, never embedded inline in application config or code. Extends "adapters own the vendor SDK" to "adapters own the vendor secret; the domain layer never sees it." |
| **Key Rotation** | Every secret and every at-rest encryption key has a defined rotation cadence and a live-rotation procedure (dual-key read-old/write-new window, never a downtime cutover); every rotation is Audit-logged; a separate, faster compromised-key revocation path exists distinct from routine rotation. |
| **API Keys** | For inbound integrations (Facebook, WhatsApp, Google Ads per the BRD) and any future outbound/public API: scoped to specific Permissions/Data Scope rather than a blanket key, attributable to one owning integration record, individually revocable, never shared across integrations, rotated on the same cadence as Key Rotation. |
| **Password Policy** | Minimum complexity/length plus breach/blocklist checking rather than forced periodic rotation; lockout/backoff after repeated failures; every login attempt, success or failure, is Audit-logged. |
| **MFA** | Not mandated day one — but User/RBAC reserves the seam (`mfaEnabled`/`mfaMethod` on the authentication concern) so it can be turned on per-Role later (mandatory for Admin/System scope, optional for Caller) as pure configuration, never a User/RBAC redesign — the same "seam, not full build" treatment already given to future Consent and AI's future Memory/Tool catalog (ADR 0010, Open Questions). |
| **Future SSO** | Authentication mechanism is a pluggable concern behind its own adapter seam (`IIdentityProviderAdapter`-shaped), never hard-coded to password auth — the identical Provider-abstraction discipline already proven for Trunk, Storage, Notification, and AI Provider. Adding SSO/SAML/OIDC later is a new adapter, never a `users`/`rbac` redesign. |

---

## 4. Audit & Immutability

### Immutable Audit Records — one canonical shape

Every module-owned audit record — `documents`' Audit Trail (ADR 0007),
`notifications`' Communication Log (ADR 0008), `ai-core`'s AI Audit Log (ADR
0010), and any future per-module audit record — conforms to one shared
shape even though ownership stays fully decentralized (no new bounded
context is created here):

| Field | Responsibility |
| --- | --- |
| `recordId` | Unique, immutable identity of this one audit fact. |
| `occurredAt` | When the audited action happened. |
| `actor` | `{ actorType: User \| System \| AI, actorId }`. |
| `action` | What happened, in business language. |
| `targetType` / `targetId` | The aggregate the action was performed on. |
| `organizationId` | Organization scope. |
| `correlationId` | Ties the audit record back to the Event Platform trace it belongs to. |
| `beforeState` / `afterState` | A diff or before/after snapshot, where feasible. |

This turns four independently worded "no update/delete use case" rules
already scattered across the domain model into one explicit, named platform
contract.

### Append-only strategy

Enforced structurally at the domain layer — no update or delete operation
exists at all for any audit record, not merely discouraged by convention. A
correction is always a new, additive record referencing the one it
corrects, exactly as already stated for Audit Trail, Communication Log, and
AI Audit Log.

### Retention

Deliberately decoupled from Event retention ([section 1](#1-event-platform))
and Document Retention Policy (ADR 0007): audit exists for legal
defensibility, not operational storage cost, so it is retained for the
longest applicable regulatory/contractual period by default — no auto-purge
without a separately approved, audit-specific Retention Policy extension.

### Archival

After an aging threshold, audit records may move to a cheaper cold-storage
tier but remain retrievable within a defined SLA for a compliance/legal
request — a storage-tier lifecycle state, never a deletion, mirroring the
already-accepted Document Archive treatment (rule 39) applied here
specifically to audit data.

### Tamper evidence

Each Audit Record is hash-chained to the previous record within its own
module's Audit Trail (or checkpointed via a periodic signed summary), so an
out-of-band edit that bypasses the application (e.g. a direct data-store
change) is provably detectable rather than merely "not exposed through the
UI." This is the one genuinely new mechanism this contract adds beyond what
was already accepted per-module.

### Administrative access

Even Admin/System-scope Roles get **read-only** access to audit data through
every interface — never write or delete. Viewing an audit record is itself
Audit-logged, so no Role, including Admin, can silently inspect or cover up
history undetected.

---

## 5. Organization Terminology

**Organization** is the single canonical term for the company/company-unit
scope used across every bounded context. "Tenant" is retired platform-wide
as of this contract (see ADR 0011's Terminology Note); it must never appear
in future documentation, and existing informal uses have been corrected in
`docs/domain/domain-model.md`, `docs/modules/notifications.md`,
`docs/modules/ai-platform.md`, and ADR 0010.

Reasoning:

- Organization is already the pervasive, accepted term: the `organization`
  bounded context itself (Team/Branch/Region/Department/Escalation Rule);
  the Organization-specific-override-by-reference pattern used identically
  by Notification Template, Report Template, Prompt Template, and AI
  Configuration; Metric Definition's `Domain` discriminator (which already
  includes an `Organization` value); and Dashboard's audience scope.
- The BRD describes one company, Mudrax Capitals, with an internal
  Branch/Region/Team/Department hierarchy — not a multi-tenant SaaS product
  serving many unrelated client companies whose data must be partitioned
  from one another. "Tenant" is multi-tenancy/SaaS vocabulary implying
  exactly that unrelated-customers-sharing-infrastructure model, which is
  not this system's shape.
- Organization already correctly absorbs the one legitimate future need: if
  Mudrax Capitals ever operates as multiple legal entities or franchises,
  that is still naturally more than one Organization record (or a
  parent/child Organization hierarchy) inside the same, already-existing
  `organization` bounded context — never a second, competing "tenant"
  concept layered on top.
- Organization scope (section 2) is always scoped to *the acting User's
  specific Organization record*, never a hard-coded singleton assumption —
  future-proofing multi-Organization without ever reintroducing "tenant."

---

## 6. Activity Timeline, Audit Log, and Communication Log

Three related but distinct concepts, previously referenced (rule 8 already
states Webhook Event Log is "not a substitute for Timeline or Audit Log")
but "Timeline" was never positively defined until now:

| Concept | Purpose | Nature |
| --- | --- | --- |
| **Activity Timeline** | *"What happened to this Lead, in order, for the person working it?"* | A business-facing, human-readable, chronological **read projection** for one business record, assembled from many modules' published events plus their Audit Trail/Communication Log entries. Not itself a system of record; can in principle be regenerated from its sources. |
| **Audit Log / Audit Trail** | *"Prove exactly what happened, who did it, and when."* | The compliance/legal **system of record** — append-only, tamper-evident, retained per regulatory need, comprehensive rather than curated. |
| **Communication Log** | Record of outbound/inbound communications (ADR 0008) — channel, provider, delivery status. | A specialized, append-only evidentiary log scoped only to communications. |

**Relationship:** Activity Timeline is a derived read model layered on top
of the Event Platform ([section 1](#1-event-platform)) plus each module's
own Audit Trail and Communication Log; the latter two are Timeline's
*inputs*, never replaced by it.

---

## 7. Consent

- **Operational Consent** — implicit permission needed to service a
  Customer's own request (calling back a Lead who asked for a callback,
  sending a loan-status update). Already governed today by the accepted
  Notification Preference/Category logic (Transactional/OTP always deliver,
  ADR 0008). A service obligation, not a marketing choice — never gated by
  Consent below.
- **Marketing Consent** — explicit, purpose-specific, provable permission
  required before any Marketing-category outreach. Exactly the future
  Consent entity already scoped in `docs/domain/domain-model.md`
  (`Requested -> Granted -> Withdrawn / Expired / Superseded`), checked
  first in the existing four-layer Notification Preference resolution order
  (ADR 0008, rule 44) before Category/Preference/Subscription are evaluated.
  This contract does not redesign Consent's shape; it confirms Consent is
  the single legal-evidence layer for Marketing eligibility platform-wide —
  `campaigns`' Broadcast sends resolve through the same centralized Consent
  check, never a parallel campaign-specific opt-in concept.
- **Future extensibility** — the same Consent entity/lifecycle extends to
  non-communication purposes this lending business will eventually need
  (data-sharing consent with a partner Bank, credit-bureau pull consent,
  AI-processing consent) via new `ConsentPurpose` discriminator values — the
  same discriminator-generalization discipline already used for Metric
  Definition's `Domain` and AI Capability — never new parallel
  consent-like entities per purpose. When built, Consent references a
  `policyVersion` (the exact text presented) rather than embedding policy
  text, following the "reference a Version, never embed" discipline already
  used for Prompt Version/Commission Policy Version/Report Template
  Version.

---

## 8. Cross-Cutting Naming Conventions

| Concern | Convention |
| --- | --- |
| **Provider abstractions** | `<Capability> Provider` Aggregate Root + `<Capability>ProviderType` (or domain-specific: `TrunkType`, `StorageProviderType`, `ChannelType`) discriminator + a single `I<Capability>ProviderAdapter` port, with vendor SDK code confined to `src/integrations/<capability>/*`. |
| **Version entities** | `<Aggregate> Version` as a child/related entity, `Draft -> Published/Effective`, mutable only in Draft; a change always creates a new Version, never an in-place edit. |
| **Status naming** | `Stage` = coarse-grained, business-meaningful pipeline position with reporting significance (Lead Stage). `Status`/`Outcome` = fine-grained, per-attempt classification (Call Feedback Status, Delivery Status). Never use `Status` where a `Stage` concept already exists; never collapse the two. |
| **Event naming** | `<AggregateName><PastTenseVerb>`, PascalCase, no module prefix in the name (module lives in the envelope's `source` field) — per [section 1](#1-event-platform). |
| **Aggregate naming** | Title Case, singular, business-language nouns (`AI Job`, not `AiJobRecord`). Intent/execution splits consistently follow `<Thing>` / `<Thing> Attempt\|Delivery\|Job\|Execution` (Loan Application/Loan Account, Call/Call Attempt, Notification/Notification Delivery, Report/Report Execution, AI Task/AI Job) — the standing pattern for any future intent-vs-execution split. |

---

## Known Risks and Mitigations

| # | Risk | Mitigation |
| --- | --- | --- |
| 1 | The Event Envelope has no owning bounded context, risking per-module drift into variant shapes. | Treated as an enforced shared schema, governed the same way `eslint-plugin-boundaries` enforces module boundaries (ADR 0001) — not owned or unilaterally changeable by any one module. |
| 2 | A scheduled job or Retention sweep could silently fail to propagate `correlationId`, breaking traceability invisibly. | `correlationId` is mandatory and non-nullable, with a narrow, explicit list of allowed trace-origin points. |
| 3 | Idempotency-key storage could grow unbounded. | Dedupe window is bounded to the Event Retention period; older replays are rejected/logged, not reprocessed indefinitely. |
| 4 | Multi-aggregate sagas could implicitly assume cross-aggregate delivery order. | Explicit rule: any such workflow implements its own state-machine/precondition checks, never relies on delivery order. |
| 5 | Cached RBAC scope could go stale immediately after a Branch/Team transfer, leaking or wrongly denying access. | Scope resolution always reads `organization`'s current membership at check time (or a short-TTL, invalidated-on-transfer cache). |
| 6 | "System" scope could become a superuser dumping ground for hard-to-classify permissions. | Every System-scope grant is individually named and justified, never blanket, and always Audit-logged. |
| 7 | PAN/Aadhaar masking enforced only at the UI layer could still leak through Reports' Dataset export (ADR 0009) or an AI Prompt Variable (ADR 0010). | Masking/redaction is a mandatory rule at every data-access/export boundary, not only presentation. |
| 8 | A hash-chain living in the same store as the record it protects is defeatable by an attacker with full data-store access. | Periodically externalize a checkpoint (chain head hash) to an independent location (separate append-only store, signed export, or third-party timestamp); the seam exists now even if the full mechanism lands later. |
| 9 | "Organization" could be assumed a hard-coded singleton, breaking the moment a second Organization is legitimately needed. | Organization scope is always scoped to the acting User's specific Organization record, never a singleton assumption. |
| 10 | New `ConsentPurpose` values without a policy-version reference risk proving consent against the wrong policy text later. | Consent references a `policyVersion` by identity, the same "reference a Version, never embed" discipline used everywhere else in this codebase. |

---

## Implementation Status

Architecture documentation only. No schema, Prisma models, APIs, UI, or
business logic exist. See
[ADR 0011](../adr/0011-platform-contracts-cross-cutting-architecture.md)
for the decision record and rationale.
