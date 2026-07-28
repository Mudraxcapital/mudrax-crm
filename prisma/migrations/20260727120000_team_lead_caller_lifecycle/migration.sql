-- Team Leads may delete/disable/suspend Callers only when Admin/Manager grants this flag.
ALTER TABLE "users"."users"
  ADD COLUMN IF NOT EXISTS "canManageCallerAccounts" BOOLEAN NOT NULL DEFAULT false;

-- user.delete is Manager+ in RBAC; Team Leads use canManageCallerAccounts instead.
DELETE FROM "rbac"."role_permissions" rp
USING "rbac"."roles" r, "rbac"."permissions" p
WHERE rp."roleId" = r.id
  AND rp."permissionId" = p.id
  AND r.name = 'Team Lead'
  AND p.code = 'user.delete';
