# Campaigns

## Purpose

Own Campaign lifecycle, User membership, Lead allocation decisions, and
campaign-level performance analysis.

## Owned Entities

- Campaign
- Campaign Membership
- Campaign Assignment
- Campaign Analytics

## Business Rules

- Campaign membership references Users; it does not create Caller identities.
- Membership and assignment actions require Permissions from `rbac`.
- A User selected during Lead upload is automatically added to Campaign
  membership before allocation if not already active.
- Equal and percentage-based allocation are supported; allocation must be
  validated and historically auditable.
- Individual Lead lifecycle remains owned by `leads`.
- Telephony Dialer Campaign is an execution configuration owned by `telephony`,
  not a replacement for the CRM Campaign.
- Campaign Analytics is derived and read-only.

## Dependencies

- Consumes Users from `users`, authorization from `rbac`, hierarchy/scope from
  `organization`, and Leads from `leads`.
- Supplies Campaign context to `telephony`, `reports`, and `analytics`.
- Publishes significant changes to `activity-timeline`.

## Implementation Status

Architecture documentation only. No schema, Prisma models, APIs, UI, or
business logic exist.
