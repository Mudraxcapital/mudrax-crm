# users — Employee Management

Single-company employee identity for Mudrax Capitals.

## Fixed roles

Admin · Manager · Team Lead · Caller

No custom roles. No permission templates. No licenses.

## Employee ID

Auto-generated in a DB transaction: `MCS0001`, `MCS0002`, …

Never collected from the UI.

## Access

| Capability | Admin | Manager | Team Lead / Caller |
|---|---|---|---|
| View User Management | Yes | Yes | No |
| Create / edit / disable | Yes | Yes (non-Admin) | No |
| Create / edit Admins | Yes | No | No |
| Reset password / delete | Yes | No | No |

## No organizationId

Users and user audit logs do not store `organizationId`. Company scope for other modules is resolved via `getCompanyId()`.
