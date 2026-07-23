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

Represents an allocation operation that distributes Campaign Leads among active
members.

- Records the assignment strategy, effective allocation, assigning User, and
  resulting Lead allocations.
- Supports equal, percentage-based, and future rule-based strategies.
- Reassignment must preserve prior allocation history for audit and reporting.
- Individual Leads remain owned by `leads`; this module owns the campaign-level
  allocation decision and history.

### Campaign Analytics

A derived, read-only business view of Campaign performance, including
assignment distribution, calling progress, connectivity, Lead outcomes,
conversion, and future acquisition cost/ROI.

- Analytics never mutates Campaigns, Leads, Calls, or Users.
- Metric definitions must be consistent with the source modules.
- Historical analytics must respect the organizational scope authorized by
  `rbac`.

## Relationships

- `leads` owns Lead identity, qualification, stage, and conversion.
- `users` supplies stable User identities for membership and assignment.
- `rbac` authorizes campaign creation, membership management, and assignment.
- `organization` supplies Team, Branch, Region, and Department scope.
- `telephony` may execute a Campaign through a separate Dialer Campaign; CRM
  Campaign and telephony execution remain distinct concepts.
- `reports` and `analytics` consume Campaign Analytics as read-only data.
- `activity-timeline` records significant Campaign membership and assignment
  events.

## Business Rules

- A Campaign must have an explicit owner and lifecycle state.
- Allocation percentages must be validated before assignment.
- Assignment is allowed only to active Campaign members who have the required
  Roles/Permissions.
- Campaign closure stops new assignments but preserves history.
- Campaign Analytics is derived from authoritative source entities; it is not
  manually editable.

## Future Expansion

- Round-robin, capacity-based, skill-based, and AI-assisted allocation.
- Campaign budgets, vendors, cost per Lead, and ROI.
- Product-specific scripts and A/B pitch testing.
- Branch- or Region-specific Campaigns.
- Predictive Dialer execution through `telephony`.

This module currently contains architecture documentation only. No database
schema, Prisma models, APIs, UI, or business logic have been created.
