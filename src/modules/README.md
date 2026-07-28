# Modules

Every business capability of Mudrax CRM lives here as an independent module. This is where the majority of engineering effort belongs.

Each module is internally layered `domain -> application -> infrastructure -> presentation` (dependencies point inward only) and exposes a single public surface via its own `index.ts`. Other modules — and `src/app` routes — may only import from a module's `index.ts`, never from its internal folders.

| Module | Purpose |
| --- | --- |
| `auth` | Authentication domain/application rules |
| `users` | Stable employee identity and profile, independent of job function |
| `rbac` | Roles, permissions, user-role assignments, and access policy evaluation |
| `organization` | Teams, Branches, Regions, Departments, calendars, working hours, and escalation policies |
| `customers` | Permanent customer record and multi-year history, identity resolved via weighted PAN/Aadhaar/phone/email matching |
| `leads` | Inbound sales inquiries prior to a Loan Application; owns Lead identity and Lead Assignment |
| `lead-center` | Staging area for inbound leads by source; Campaign Leads are created only after review + import |
| `integrations` | Connector configuration (field mappings, webhooks, API keys); does not display leads |
| `campaigns` | Campaign lifecycle, membership, and allocation decisions (initiates assignment through `leads`; does not own Campaign Analytics) |
| `loan-applications` | Central loan request lifecycle |
| `loan-products` | Catalog of loan products per bank |
| `banks` | Lending partner / NBFC master data |
| `disbursements` | Disbursement events and DSA commission tracking |
| `loan-accounts` | Post-disbursement EMI/foreclosure/closure lifecycle |
| `documents` | Document upload/storage, attachable to any entity |
| `follow-ups` | Scheduled follow-up/callback tasks |
| `activity-timeline` | First-class, polymorphic activity history for every major entity |
| `reports` | Cross-module operational reporting |
| `analytics` | Higher-level insights built on `reports` and other modules |
| `notifications` | Channel-based outbound notifications (email/sms/whatsapp/in-app/push) |
| `telephony` | Enterprise call platform (click-to-call, IVR, dialer, monitoring, recording) |
| `ai` | AI platform (agents, chat, RAG, embeddings, summaries, analytics) |

## Identity and Access Boundary

`users` and `rbac` are the only modules responsible for employee identity and
authorization:

- **User is the identity.** A User represents the same person throughout their
  employment and retains their identity when promoted, transferred, or given
  additional responsibilities.
- **Role defines permissions.** Caller, Manager, Team Leader, and Admin are
  assignments made to a User; they are not entities with separate identities
  and are not standalone business modules.
- **RBAC controls access.** Authorization decisions are evaluated from the
  User's assigned Roles and the Permissions granted to those Roles.
- Future positions such as HR, Branch Manager, Regional Manager, Recovery
  Officer, and Sales Executive must be introduced as Roles, not as new modules.

The approved enterprise RBAC relationship is:
`Users -> UserRoles -> Roles -> RolePermissions -> Permissions`. This describes
the architecture only; no database schema or Prisma models exist yet. See
[`rbac/README.md`](rbac/README.md) and ADR 0002 for details.

## Organization and Campaign Boundaries

- `organization` owns Teams, Branches, Regions, Departments, Holiday
  Calendars, Working Hours, and Escalation Rules. It references Users and Roles
  but never duplicates identity or authorization.
- `campaigns` owns Campaign, Campaign Membership, and allocation decisions.
  It never writes Lead state directly — it initiates assignment through
  `leads`' public API. `leads` owns Lead identity, lifecycle, and Lead
  Assignment (current assignee and history); `telephony` continues to own
  call execution and Dialer Campaigns; `reports` owns Campaign Analytics.

## Customer Identity Boundary

- `customers` is the sole owner of Customer identity, resolved from a
  weighted set of identifiers — PAN and Aadhaar (masked/hashed) as strong
  anchors when available, multiple phone numbers and email addresses
  (including historical values) as supporting, non-exclusive signals. Phone
  number is explicitly not the identity anchor.
- Every Lead belongs to exactly one Customer from the moment it is created;
  `leads` requests identity resolution from `customers` and never writes
  Customer fields directly.
- See `docs/domain/domain-model.md` and
  `docs/adr/0004-crm-core-customer-identity-and-lead-ownership.md` for the
  full identity-resolution waterfall, Identity Confidence tiers, Duplicate
  Candidate handling, and Customer Merge rules.

**Never put here**: framework/route code (belongs in `src/app`), generic reusable code with no business meaning (belongs in `src/shared`), or app-wide infrastructure singletons (belongs in `src/infra`).
