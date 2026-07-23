# Modules

Every business capability of Mudrax CRM lives here as an independent module. This is where the majority of engineering effort belongs.

Each module is internally layered `domain -> application -> infrastructure -> presentation` (dependencies point inward only) and exposes a single public surface via its own `index.ts`. Other modules — and `src/app` routes — may only import from a module's `index.ts`, never from its internal folders.

| Module | Purpose |
| --- | --- |
| `auth` | Authentication domain/application rules |
| `users` | Stable employee identity and profile, independent of job function |
| `rbac` | Roles, permissions, user-role assignments, and access policy evaluation |
| `organization` | Teams, Branches, Regions, Departments, calendars, working hours, and escalation policies |
| `customers` | Permanent customer record and multi-year history |
| `leads` | Inbound sales inquiries prior to a Loan Application |
| `campaigns` | Campaign lifecycle, membership, assignment, and campaign analytics |
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
- `campaigns` owns Campaign, Campaign Membership, Campaign Assignment, and
  Campaign Analytics. `leads` continues to own Lead identity and lifecycle;
  `telephony` continues to own call execution and Dialer Campaigns.

**Never put here**: framework/route code (belongs in `src/app`), generic reusable code with no business meaning (belongs in `src/shared`), or app-wide infrastructure singletons (belongs in `src/infra`).
