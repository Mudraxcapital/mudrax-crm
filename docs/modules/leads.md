# Leads

## Purpose

Own the sales-pipeline lifecycle of a Lead from capture through qualification,
calling, and conversion — including who is currently assigned to work it, its
configurable pipeline stage, the per-call outcome history, scheduled
follow-ups, and the auditable bulk-intake (Excel import) workflow that
creates Leads in the first place. `leads` is the single write path for
everything that happens to a Lead.

## Key Entities

- `Lead` - inbound sales inquiry; owns qualification, pipeline stage, and
  conversion. Belongs to exactly one Customer from the moment it is created
  (see `customers.md`). Lifecycle: Created (Fresh) -> active pipeline stages
  -> Closed-Won / Closed-Lost. Reopening a closed Lead is not supported; a
  re-upload marked "reload as fresh" creates a new Lead instead.
- `Lead Assignment` - the current assignee and the auditable history of how
  that ownership changed. Current assignee is part of the Lead aggregate's
  consistency boundary; history is an append-only log. Lifecycle: Unassigned
  -> Assigned -> Reassigned (repeatable).
- `Lead Source` - structured, reportable channel a Lead originated from
  (Excel Upload, Facebook, Website, Google Ads, WhatsApp). Reference/catalog
  entity; never free text.
- `Lead Stage` - admin-configurable pipeline position (Fresh, Ringing,
  Interested, Follow-up, Won, Lost, etc.), classified into Initial / Active /
  Closed buckets. Reference/catalog entity, never a hardcoded enum.
- `Lost Reason` - admin-configurable sub-classification of why a Lead was
  marked Lost. Required whenever Lead Stage moves into the Closed-Lost
  bucket.
- `Call Feedback Status` - admin-configurable outcome of one specific call
  attempt (Connected, No Answer, Switched Off, Number Busy, etc.). A Lead
  accumulates many Call Feedback records over its life; this catalog is a
  distinct concept from Lead Stage (see Business Rules).
- `Follow-up` - scheduled callback/reminder task. Its own Aggregate Root
  within this module, referencing a Lead by identity rather than living
  inside the Lead aggregate. Lifecycle: Scheduled -> Due ->
  Completed/Missed -> Escalated.
- `Import Batch` - the auditable unit of one bulk lead-intake operation (an
  Excel upload). Lifecycle: Uploaded -> Parsed -> Awaiting Resolution ->
  Resolved -> Committed -> Completed (frozen summary).
- `Import Row` - one raw intake record within an Import Batch; immutable once
  parsed.
- `Duplicate Match` - records an Import Row's match against an existing
  Customer's Lead history and the human resolution decision made about it.
- `Notes` - a Caller's optional, append-only free-text note on a Lead.
- `Tags` and `Custom Field Definition` / `Custom Field Value` - lightweight,
  admin-configurable extensions to a Lead, deliberately scoped to Lead only
  today (see Open Questions).
- `Saved Views` - a User's saved filter/query preset over the Lead list.

## Business Rules

- Every Lead belongs to exactly one Customer from the moment it is created;
  there is no orphan Lead. Customer identity resolution (see `customers.md`)
  runs before or as part of Lead creation.
- `leads` is the sole owner and sole writer of Lead Assignment. `campaigns`
  may initiate an assignment operation (bulk equal/percentage allocation, or
  a Team Leader/Manager's ad hoc reassignment) through this module's public
  API — it never writes Lead state directly. This keeps the
  `campaigns` -> `leads` dependency one-directional.
- Lead Stage and Call Feedback Status are permanently separate catalogs.
  Lead Stage answers "where is this Lead in the pipeline right now"; Call
  Feedback Status answers "what happened on this specific call attempt."
  Multiple Call Feedback records accumulate against one Lead without
  changing its Stage; a Stage change is never mechanically derived from the
  latest Call Feedback value.
- A Lead cannot transition into a Closed-Lost stage without a Lost Reason.
- Follow-up is its own Aggregate Root, not a child entity of Lead. Lead
  retains only a denormalized "next action" projection, updated exclusively
  by a Follow-up domain-event listener — no other code path may write it.
- The Import Batch workflow follows a fixed shape: Import Batch -> Import
  Row -> Duplicate Match -> Human Resolution -> Allocation (via `campaigns`)
  -> Lead Creation. Duplicate detection runs two layers: (1) automatic
  Customer-identity resolution, and (2) presentation of that Customer's
  existing Lead history grouped by disposition for an Admin/Manager to
  resolve (selective delete, delete-all, ignore, or reload-as-fresh).
- Import Batch and Import Row are immutable audit records once committed; a
  Duplicate Match resolution is never silently overwritten.
- Assignment is allowed only to Campaign members who hold the required
  Roles/Permissions from `rbac`.
- Custom Field Definitions must declare a bounded data type (text/number/
  date/single-select); no schema-less/free-form fields.

## Who Can Do What

| Role | Capability |
| --- | --- |
| Admin | Full Lead access; configures Lead Stage, Lost Reason, Call Feedback Status, and Custom Field catalogs; uploads Import Batches; deletes data |
| Manager | Uploads Import Batches; reassigns Leads/Follow-ups within their span; views team Leads |
| Team Leader | Reassigns Leads/Follow-ups within their team; views team Leads; cannot upload |
| Caller | Works assigned Leads only; sets Stage/Call Feedback/Follow-up on own portfolio; adds optional Notes; cannot reassign or upload |

## Relationships

- `customers` supplies the Customer every Lead belongs to.
- `campaigns` initiates bulk assignment operations through this module's
  public API; it never writes Lead state directly.
- `rbac` authorizes assignment, reassignment, and configuration actions.
- `organization` supplies Working Hours, Holiday Calendar, and Escalation
  Rule policy consumed by Follow-up scheduling and escalation.
- `telephony` (out of scope for this document) records Call Feedback Status
  against a Lead as the result of a call attempt; it does not own the
  catalog.
- `notifications` (out of scope for this document) is called to send
  Interested/overdue-Follow-up alerts; inbound "I am interested" replies are
  translated into Lead commands, never direct writes from `notifications`.
- `activity-timeline` records significant Lead, Assignment, Stage, and
  Follow-up events.
- `reports` consumes Lead facts as read-only data; it does not receive write
  access.

## Open Questions

- Should Import Batch/Row/Duplicate Match be extracted into a standalone
  module if a second entity type (e.g. Customer-direct import) ever needs
  bulk intake? Today they stay inside `leads` because only Lead import
  exists.
- Should Tags/Custom Fields be extracted into a shared, entity-agnostic
  capability the moment a second entity (e.g. Customer) needs the same
  pattern, rather than duplicating it?

This module currently contains architecture documentation only. No database
schema, Prisma models, APIs, UI, or business logic have been created.
