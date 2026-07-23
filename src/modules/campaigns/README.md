# Campaigns Module

Owns the business lifecycle for grouping Leads into calling initiatives,
selecting eligible Users, allocating work, and measuring campaign performance.
It is the coordination boundary between lead intake and telephony execution.

## Ownership

### Campaign

A named business initiative that groups Leads for assignment and calling.

- Lifecycle: Draft -> Active -> Paused -> Closed.
- A Lead intake/import targets one Campaign.
- A Campaign may be associated with a Lead Source, product intent, geography,
  lender, or acquisition period without changing the Lead lifecycle itself.

### Campaign Membership

Records which Users may work a Campaign and their allocation configuration.
Users remain identities owned by `users`; calling eligibility is authorized by
`rbac`.

- Membership may include an equal-share or explicit percentage allocation.
- Selecting a User during upload must automatically create active membership
  when it does not already exist.
- Removing membership must not rewrite historical assignments or performance.

### Campaign Assignment

Represents an allocation *decision* that distributes Campaign Leads among
active members. This module decides the strategy and effective split; it
never writes Lead state itself.

- Records the assignment strategy, effective allocation, and assigning User.
- Supports equal, percentage-based, and future rule-based strategies.
- Execution happens by initiating an assignment command against `leads`'
  public API — `leads` is the sole writer of the resulting Lead Assignment
  (current assignee and its history). This keeps the dependency strictly
  one-directional (`campaigns` -> `leads`) and avoids a circular dependency
  between the two modules.
- Individual Leads and Lead Assignment remain owned by `leads`; this module
  owns only the campaign-level allocation *decision*.

### Campaign Analytics — owned by `reports`, not this module

Campaign performance — assignment distribution, calling progress,
connectivity, Lead outcomes, conversion, and future acquisition cost/ROI —
is a derived, read-only business view owned by `reports`, computed from the
authoritative facts this module, `leads`, and `telephony` publish.

- This module supplies Campaign, Membership, and Assignment-decision facts;
  it does not itself compute or store an analytics entity.
- Centralizing analytics in `reports` avoids two modules independently
  computing, and potentially disagreeing on, the same performance numbers.
- See `docs/adr/0004-crm-core-customer-identity-and-lead-ownership.md`.

## Relationships

- `leads` owns Lead identity, qualification, stage, conversion, and Lead
  Assignment. This module initiates assignment operations through `leads`'
  public API; it never writes Lead state directly.
- `users` supplies stable User identities for membership and assignment.
- `rbac` authorizes campaign creation, membership management, and assignment.
- `organization` supplies Team, Branch, Region, and Department scope.
- `telephony` may execute a Campaign through a separate Dialer Campaign; CRM
  Campaign and telephony execution remain distinct concepts.
- `reports` owns Campaign Analytics, computed from facts this module,
  `leads`, and `telephony` publish; this module does not own an analytics
  entity itself.
- `activity-timeline` records significant Campaign membership and assignment
  events.

## Business Rules

- A Campaign must have an explicit owner and lifecycle state.
- Allocation percentages must be validated before assignment.
- Assignment is allowed only to active Campaign members who have the required
  Roles/Permissions.
- Campaign closure stops new assignments but preserves history.
- This module never mutates Lead state directly; it always goes through
  `leads`' public API to initiate an assignment.

## Future Expansion

- Round-robin, capacity-based, skill-based, and AI-assisted allocation.
- Campaign budgets, vendors, cost per Lead, and ROI.
- Product-specific scripts and A/B pitch testing.
- Branch- or Region-specific Campaigns.
- Predictive Dialer execution through `telephony`.

This module currently contains architecture documentation only. No database
schema, Prisma models, APIs, UI, or business logic have been created.
