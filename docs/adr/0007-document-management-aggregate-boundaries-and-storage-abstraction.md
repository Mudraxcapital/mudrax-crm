# 0007 — Document Management: Aggregate Boundaries, Storage Abstraction, and Document Bundles

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-07-24 |

## Context

CRM Core (ADR 0004), Loan Management (ADR 0005), and Telephony & Call Center
(ADR 0006) are accepted and are not revisited by this decision. Following
their approval, the Document Management bounded context was designed and
reviewed, covering: Attachment, Document, Document Type, Document Category,
Document Checklist, Document Checklist Template, Document Bundle, Bundle
Member, Verification Status, Document Verification, OCR, Extracted Fields,
Document Version, Storage, Upload Session, File Metadata, Retention Policy,
Archive, Document Sharing, Audit Trail, Watermark, future Digital Signature,
future eKYC, and the polymorphic KYC/Customer/Loan Document relationship to
Customer, Lead, Loan Application, Loan Account, and Disbursement. Eleven
unresolved modeling questions were identified, plus a follow-up question
raised after initial review:

1. Whether Attachment and Document should be the same entity or two.
2. Whether Document Version should be a child entity, a separate Aggregate
   Root, or external storage only.
3. How OCR should work — separate Aggregate, background process, or value
   object — and how Extracted Fields relate to it.
4. Whether Document Verification belongs to Document or is its own Aggregate.
5. Whether Document Checklist should be scoped per Loan Product, Global, or
   both.
6. Whether Documents should be polymorphic across Customer, Lead, Loan
   Application, Loan Account, and Disbursement without creating ownership
   confusion.
7. How storage should be abstracted to support Local Disk, NAS, S3, Azure
   Blob, and future providers without redesign.
8. How retention and archival should work, and whether Archive is a separate
   entity.
9. What the complete document lifecycle looks like end-to-end.
10. What weaknesses exist in the above design and how they should be
    addressed before finalizing.
11. (Raised after initial review) Whether a **Document Bundle** concept is
    needed to represent a complete document package for one business
    process (e.g. Loan Application Documents, KYC Package, Property
    Documents, Co-applicant Documents), and if so, how it relates to
    Document Checklist and Document Verification, how it supports multiple
    applicants, and how it supports future AI completeness checking.

Leaving any of these unresolved risked the same class of ownership ambiguity
CRM Core, Loan Management, and Telephony each had to resolve once: two
aggregates writing the same fact, KYC-grade compliance overhead forced onto
every trivial uploaded file, a storage vendor choice baked into domain logic,
or a future capability (OCR engines, AI classification, Aadhaar/PAN OCR,
bank-statement parsing, eSign, face match, immutable audit, encrypted
storage, virus scanning) forcing a disruptive redesign because today's model
gave it no seam to attach to.

## Decision

### Attachment and Document are separate entities

`documents` owns **Attachment** as the generic registration of any raw
uploaded file — used by any module (an Excel import file, a WhatsApp media
capture, an export), not only compliance documents — and **Document** as a
business-classified, workflow-bearing wrapper built on top of one
Attachment's version history. This mirrors the discipline this codebase
already applies to Import Batch/Row vs. Lead and Call Recording vs. Call
Attempt: separate the raw fact from the business-meaningful entity built on
top of it. Not every Attachment is promoted to a Document; every Document
traces back to exactly one Attachment lineage via its Versions. A file must
pass virus/malware scanning (`Clean`) before it may be promoted to a
Document, OCR'd, or shared.

### Document Version is a child entity; the payload is always external

**Document Version** is a child entity of Document, never an independent
Aggregate Root and never merely "external storage" as the entity model —
its metadata must be a first-class, referenceable entity so Verification,
OCR, and Sharing can pin against one specific version. Applying the same
independent-lifecycle test already used to reject EMI Schedule and Campaign
Analytics as standalone aggregates: a Version's dominant queries ("show me
this document's history") are always Document-scoped, never portfolio-wide.
The actual file bytes are always an **external Storage Reference**, never
inlined — the identical rule already applied to Call Recording's audio
payload (ADR 0006). A resubmission always appends a new Version and marks
the prior one Superseded; no Version is ever edited or replaced in place.

### OCR is a background process producing a child OCR Job and Extracted Fields

**OCR Job** is a child entity of Document Version — not a Value Object
(it needs identity, a status lifecycle, retry semantics, and an
engine/version discriminator) and not a separate Aggregate Root (its
invariants and queries are always Document-Version-scoped, never
portfolio-wide, failing the same test that promoted Follow-up and Document
Verification to independent aggregates). The actual extraction — calling an
OCR/AI engine, polling, retrying — is application-layer background-job
orchestration, not domain state; the domain only records the Job's
lifecycle and its resulting **Extracted Field** children. An engine/type
discriminator (`GenericOCR` / `AadhaarOCR` / `PANOCR` / `BankStatementParser`
/ future) is the seam for new extraction capabilities, the same discriminator
pattern already used for `TrunkType` (ADR 0006) and Application Type (ADR
0005). Extracted Fields are permanently **advisory**: they never
auto-write into `customers`' Customer Identifier or any other module's
trusted state — promotion to a trusted fact always requires an explicit
human/Verification confirmation step, preserving `customers`' own Identity
Confidence discipline (ADR 0004). A human override of an Extracted Field is
recorded via Audit Trail, never a silent overwrite of the original AI
output.

### Document Verification is an independent Aggregate Root, pinned to a Version

**Document Verification** is its own Aggregate Root, referencing Document
and a pinned `Document Version` ID by identity — never "the current
version." This is a direct application of the same independent-lifecycle
test already used repeatedly in this codebase: a Verification Officer's
dominant queries ("what's pending across my whole queue today," "rejections
this week by document type," "escalations older than 24 hours") are
portfolio-wide, not naturally scoped to one Document — the same reasoning
that pulled Follow-up out of Lead (ADR 0004) and kept Agent Session
independent of Call Attempt (ADR 0006). Pinning the exact reviewed Version
prevents a mid-review resubmission from silently invalidating an in-flight
decision, the same defense-in-depth Commission already applies by
snapshotting Commission Policy Version rather than joining live (ADR 0005).
**Verification Status** (Pending / Verified / Rejected / Needs-Resubmission
/ Escalated) is a Value Object catalog on Document Verification, not its own
entity. A Rejected/Needs-Resubmission outcome always opens a **new**
Verification against the next Version — never a mutation of the rejected
one.

### Document Checklist works at two layers — Global and Loan-Product, never one or the other

**Document Checklist Template** (Aggregate Root) can be Global (applies to
every case by default) or scoped to one Loan Product **by reference**
(never embedded) — the identical "Bank offers Loan Product" pattern from
ADR 0005. A Loan-Product template is additive to the Global one; dropping a
global mandatory requirement requires an explicit, auditable override, never
a silent omission. **Document Checklist** (an independent Aggregate Root,
not a child of anything) is the materialized, per-case tracking instance —
the union of applicable Global + Loan-Product template items, generated once
at case creation and never silently recomputed if the template changes
mid-case. This avoids the exact anti-pattern ADR 0005 rejected for Bank/Loan
Product: embedding checklist items directly on Loan Product would force
reloading and locking that frequently-changing aggregate on every checklist
edit.

### Document Bundle is a new, independent Aggregate Root representing a complete package

**Document Bundle** is introduced as an Aggregate Root to represent one
complete, presentable, verifiable, shareable package of Documents for one
business process — "Loan Application Documents," "KYC Package," "Property
Documents," "Co-applicant Documents." It passes the same
independent-lifecycle test as Document Verification and Document Sharing: a
Bundle's dominant queries ("is this package ready to send to the Bank,"
"show me the KYC package for Co-applicant 2," "which Bundles are awaiting
lock across my desk today") are Bundle-centric and portfolio-wide, and it
carries its own invariants (a lock/submit event, a pinned-snapshot moment,
independent shareability) that neither Checklist nor Document have. It is
deliberately **not** a child of Document Checklist (would conflate "is
requirement X fulfilled" bookkeeping with "here is a shippable, lockable
package" — two different consistency boundaries) and **not** a child of
Loan Application (would cross into Loan Management, out of scope here).

- **Relationship to Document Checklist:** Checklist defines *what's
  required*; Bundle curates *how required items are grouped and delivered*.
  A Bundle never invents its own required-item list — it always derives
  "what should be in me" from the case's Document Checklist, filtered by
  Document Category and/or Subject. One case has one Checklist but may have
  several Bundles (KYC Package, Property Documents, Co-applicant Documents,
  Loan Execution Documents); every Checklist Item belongs to at most one
  Bundle at a time, so completeness reporting adds up without double-
  counting.
- **Relationship to Document Verification:** Verification stays
  single-document; Bundle completeness is a pure **derived rollup** over its
  members' existing Document Verification outcomes — `Complete` only when
  every mandatory member's Document is independently `Verified`. No parallel
  or shortcut verification path is introduced; a future cross-document
  consistency check (e.g., name-matching across PAN/Aadhaar/Photo within one
  Bundle) can be added later as its own capability without altering Document
  Verification's shape.
- **Multiple applicants:** supported through an optional **Subject**
  reference on Bundle — `{subjectType: PrimaryApplicant | CoApplicant |
  Asset | None, subjectId}`. `CoApplicant` resolves `subjectId` against
  `loan-applications`' existing Co-applicant child entity by identity only,
  never duplicated here. Each co-applicant gets their own independently
  trackable, completable, lockable Bundle, matching real underwriting
  practice.
- **Future AI completeness checking:** structural completeness (every
  mandatory Checklist Item mapped into the Bundle has a Verified Document)
  is already fully computable without AI. Content-level/semantic
  completeness (a bank statement missing a page, a name mismatch across
  KYC documents) is inherently a set-level property, requiring a check that
  sees the whole Bundle at once — this is the reason Bundle, not Document,
  is the right unit for it. The seam is the same shape already established
  for OCR Job (Queued → Processing → Completed/Failed, advisory findings
  until human-confirmed), scoped to a `bundleId` instead of a
  `documentVersionId`, attaching with zero structural change to Document,
  Document Version, Checklist, or Verification.
- **Bundle Member** is a child entity of Document Bundle linking one
  Document (and, where applicable, the Checklist Item it fulfills) into the
  Bundle. A Document may be an active member of more than one Bundle across
  different cases (e.g., a Customer-owned PAN reused across a Loan
  Application's and a later Loan Account's KYC Bundle) — always a reference,
  never a re-parenting. Locking a Bundle pins the exact Document Version of
  every member at that moment, the same pinning discipline as Document
  Verification and Commission.

### Documents are polymorphic through a single, disciplined Owner Context

Every Document carries exactly one `OwnerContext = {ownerType: Customer |
Lead | LoanApplication | LoanAccount | Disbursement, ownerId}` — the same
discriminator pattern already accepted for `TrunkType` and Application Type.
Ownership confusion is prevented by three rules: (1) exactly one accountable
owner at a time, never a multi-parent join; (2) **Customer is the permanent
anchor** for KYC-classified Documents (Document Category = KYC) — mirroring
`customers`' own principle that Customer is the durable identity anchor and
Lead/Loan Application are transactional layers on top — so a PAN card
collected at Lead stage never needs re-upload for every subsequent Loan
Application, Loan Account, or Disbursement; (3) cross-case reuse is always
an explicit Link (a Checklist Item or Bundle Member referencing an existing
Document) or Document Sharing, never a re-parenting of the Document's
`OwnerContext`. If a Lead's owning Customer changes via Customer Merge (ADR
0004), every Document whose `OwnerContext` pointed at the merged-away
Customer resolves through the same tombstone/redirect mechanism — never
orphaned, never silently duplicated. Customer Documents, Loan Documents, and
KYC Documents are therefore not separate entity types — they are a Document
classified by `OwnerContext.ownerType` and/or `Document Category`.

### Storage is abstracted behind a single provider port

`documents` owns **Storage Location** as an Aggregate Root with a
`StorageProviderType` discriminator (`LocalDisk` | `NAS` | `S3` |
`AzureBlob` | future), structurally identical to how ADR 0006 solved the
same problem for Telephony (`Trunk` + `TrunkType` + `ITelephonyProvider`).
Domain and application layers depend only on an `IStorageProvider` port
(`store` / `retrieve` / `delete` / `presign` / `stream`); every vendor SDK
call lives exclusively in `src/integrations/storage/*`, never inside
`documents`' domain layer. Attachment and Document Version never store a
raw path string — they store a `Storage Reference` value object
(`storageLocationId + key + checksum + size`), resolved through Storage
Location at read time. Adding a new provider is one new adapter and one new
`StorageProviderType` value — zero change to Attachment, Document, Document
Version, or any workflow entity. Encryption-at-rest is a configuration
attribute of Storage Location, not a separate entity.

### Retention and Archive are kept as separate concerns from Document's own workflow state

**Retention Policy** (a versioned, append-only Aggregate Root, the same
pattern as Commission Policy Version) answers "how long must this be kept,
and under what trigger," scoped by Document Category/Type. A policy edit
creates a new version; a Document's retention clock is computed from the
policy version effective when its trigger fired, so a later policy change
never reaches back and changes a document's fate. **Archive** is a
storage-tier **lifecycle state** on Document/Document Version
(`Active → Archived → Purge-Eligible → Purged`), not a new entity duplicating
Document data — deliberately distinct from Document's business-workflow
state (Draft/Active/Superseded/Verified/Rejected) and from Document
Verification's status, the same "status catalogs stay separate" discipline
already established for Application Status vs. Loan Status vs. EMI
Installment pay-status (ADR 0005) and Call Disposition vs. Call Feedback
Status (ADR 0006). A Legal Hold flag overrides Retention Policy's computed
purge date; Purge is the only hard, irreversible action in the whole bounded
context and requires policy eligibility **and** no active Legal Hold **and**
no open Verification/Sharing/Bundle-lock referencing that Document.

### Document Sharing is an independent Aggregate Root; Audit Trail is structurally append-only

**Document Sharing** is an independent Aggregate Root (dominant queries are
compliance/portfolio-wide — "everything shared externally this quarter" —
not Document-scoped, the same test applied to Document Verification and
Document Bundle above), pinning the exact Document Version(s) or Document
Bundle it exposes, never "whatever is current." Every access creates an
append-only **Share Access Log Entry**; a share always has an expiry.
**Audit Trail** is a platform-level Aggregate Root (the same treatment as
the approved-but-future Webhook Event Log) recording every significant
action across this bounded context; it is designed from day one with **no
update or delete use-case exposed at the domain layer at all** — structurally
append-only, not append-only by convention, satisfying the future
"Immutable audit" requirement without a later retrofit.

### Watermark stays a rendering policy, not a persisted per-view event; Digital Signature and eKYC are future, separate Aggregates

**Watermark** is a declarative rendering policy (text pattern, opacity,
placement) attached to a Document Type/Category or Retention Policy, applied
at view/export time — not a new persisted entity recording every view. It is
permanently distinct from the future **Digital Signature** capability: a
watermark is cosmetic, a signature is a legally binding cryptographic
execution artifact, and the two must never be collapsed into one concept,
the same discipline already applied to Call Disposition vs. Call Feedback
Status. Digital Signature (future Aggregate Root) and eKYC Verification
(future Aggregate Root, producing a Document Verification with
`method = eKYC`) both plug into the existing Document Verification method
discriminator with no structural change required when they ship.

## Consequences

- Attachment stays lightweight for every non-compliance file in the system;
  Document only carries KYC-grade overhead when a file is deliberately
  promoted.
- Document Version history is fully preserved and safely external, matching
  the discipline already used for Call Recording's audio payload.
- OCR, and future Aadhaar OCR / PAN OCR / bank-statement parsing / AI
  classification, plug in as new engine-type values on OCR Job — no
  structural redesign.
- Document Verification and Document Bundle can be queried and worked
  portfolio-wide (verification queue, packages awaiting lock) without
  scanning every Document.
- Document Checklist Template's Global/Loan-Product split lets checklist
  requirements evolve independently of Loan Product master data.
- Document Bundle gives "Loan Application Documents," "KYC Package,"
  "Property Documents," and "Co-applicant Documents" a real, presentable,
  shareable home without duplicating Checklist's requirement tracking or
  Verification's per-document decision.
- A Document safely traces to Customer, Lead, Loan Application, Loan
  Account, or Disbursement with exactly one accountable owner at a time, and
  KYC Documents are naturally reusable across a Customer's whole multi-year
  relationship.
- Storage provider changes (adding S3-compatible providers, GCS, or
  replacing NAS) never touch domain logic.
- Retention, Archive, and Document's own workflow state remain three
  answerable-independently concerns.
- Audit Trail and Document Sharing give compliance genuine, structural
  guarantees rather than conventions.
- Digital Signature and eKYC have a ready attachment point (the Verification
  method discriminator) with no redesign required at implementation time.

## Alternatives Considered

- **Merge Attachment and Document into one entity**: rejected — would force
  every trivial uploaded file to carry KYC-grade classification, verification,
  and retention metadata it never needs.
- **Promote Document Version or OCR Job to independent Aggregate Roots**:
  rejected — neither has dominant queries or invariants independent of its
  parent Document Version/Document, failing the same test that rejected EMI
  Schedule and Campaign Analytics as standalone aggregates.
- **Model OCR as a Value Object**: rejected — OCR needs identity, a status
  lifecycle, retry semantics, and an engine discriminator, none of which a
  Value Object can carry.
- **Keep Document Verification as a child of Document**: rejected — its
  dominant queries are portfolio-wide (verification queue, escalations), the
  same reasoning that pulled Follow-up out of Lead and kept Agent Session
  independent of Call Attempt.
- **Embed Checklist items directly on Loan Product**: rejected — repeats the
  exact anti-pattern ADR 0005 rejected for Bank/Loan Product, locking a
  frequently-changing aggregate on every checklist edit.
- **Model Document Bundle as a child of Document Checklist**: rejected —
  conflates two different consistency boundaries (requirement-fulfillment
  bookkeeping vs. a shippable, lockable package).
- **Model Document Bundle as a child of Loan Application**: rejected — would
  cross into the Loan Management bounded context, which this ADR does not
  revisit.
- **Give Document Bundle its own parallel verification workflow**: rejected —
  would create a second, potentially disagreeing source of truth alongside
  Document Verification; Bundle completeness is always a derived rollup.
- **Use a single mutable "ownerId" without a type discriminator**: rejected —
  loses the ability to safely resolve which module's aggregate a Document
  belongs to; the closed, versionable `OwnerContext` discriminator avoids
  this.
- **Let Loan Application/Loan Account "own" a Customer's KYC Document
  directly**: rejected — would force re-uploading the same KYC evidence for
  every new case a returning Customer generates, contradicting `customers`'
  multi-year identity-anchor principle.
- **Bind Document/Attachment directly to a specific storage vendor SDK**:
  rejected — repeats the exact risk ADR 0006 avoided for telephony providers;
  the `IStorageProvider` port and `StorageProviderType` discriminator prevent
  a redesign on every new provider.
- **Model Archive as a new entity duplicating Document fields**: rejected —
  Archive is a storage-tier lifecycle state, not new business data.
- **Model Watermark as a persisted per-view event**: rejected — it is a
  declarative rendering policy, not a stateful record; per-access facts are
  already captured by Share Access Log Entry and Audit Trail.
- **Treat Audit Trail as append-only by convention only**: rejected — the
  future "Immutable audit" requirement demands a structural guarantee (no
  update/delete use-case at all), not a team agreement that could erode over
  time.

## Open Questions

- Whether a future Bundle-level cross-document consistency check (e.g.,
  name-matching across PAN/Aadhaar/Photo within one Bundle) should be a new
  entity or an extension of Document Verification's method discriminator —
  acknowledged as a future hook, not designed here.
- Whether Digital Signature should support multi-party sequential signing
  (loan agreement signed by Customer, Co-applicant, and Mudrax
  representative in a defined order) — deferred to implementation-time
  design when Digital Signature is actually built.
- Whether eKYC Verification's Face Match Result needs its own retention rule
  distinct from the Document Category it supports, given biometric data's
  stricter regulatory handling — deferred to implementation-time design.

This ADR defines architecture only. It does not authorize database tables,
Prisma models, SQL, APIs, or UI.
