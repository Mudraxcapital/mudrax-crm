// ============================================================================
// prisma/seed/lib/rbac-catalog.ts
//
// Data-driven Permission catalog + Role -> Permission grant computation.
//
// Source of truth for the shape being seeded:
//   - ADR 0002: "Users -> UserRoles -> Roles -> RolePermissions -> Permissions",
//     Caller / Manager / Team Leader / Admin as the canonical Roles.
//   - platform-contracts.md §2 (RBAC Data Scope): Self / Team / Branch /
//     Organization / System, with the typical-holder mapping
//     Caller=Self, Team Leader=Team, Branch Manager=Branch,
//     Senior Manager/Admin=Organization, System=explicitly-named grants only.
//
// Every Permission is declared once with the *lowest* Role tier that holds
// it (`minRole`); every Role at or above that tier inherits it at its own
// natural Data Scope. `systemOnly` permissions are the small, individually
// justified exception platform-contracts.md §2 requires ("Known Risk #6" —
// System scope must never become a superuser dumping ground) — held by
// Admin alone, at SYSTEM scope instead of Admin's normal Organization scope.
// ============================================================================

export type RoleName = "Caller" | "Team Leader" | "Manager" | "Admin";
export type DataScopeValue = "SELF" | "TEAM" | "BRANCH" | "ORGANIZATION" | "SYSTEM";

const ROLE_TIER: Record<RoleName, number> = {
  Caller: 0,
  "Team Leader": 1,
  Manager: 2,
  Admin: 3,
};

const ROLE_NATURAL_SCOPE: Record<RoleName, DataScopeValue> = {
  Caller: "SELF",
  "Team Leader": "TEAM",
  Manager: "BRANCH",
  Admin: "ORGANIZATION",
};

export const ROLE_DEFINITIONS: { name: RoleName; description: string }[] = [
  {
    name: "Caller",
    description:
      "Front-line calling / lead-working position. Data Scope: Self — only records the Caller owns or is directly assigned to (ADR 0002; platform-contracts.md §2).",
  },
  {
    name: "Team Leader",
    description:
      "Supervises one Team of Callers. Data Scope: Team — records belonging to any User who is a member of the same Team.",
  },
  {
    name: "Manager",
    description:
      "Oversees a Branch (the 'Branch Manager' typical holder in platform-contracts.md §2). Data Scope: Branch — records belonging to any Team/User under the same Branch.",
  },
  {
    name: "Admin",
    description:
      "Organization-wide administrator. Data Scope: Organization for ordinary business data, plus a small, explicitly-named set of System-scope grants (RBAC administration, impersonation, provider/integration configuration, read-only audit access).",
  },
];

interface PermissionDefinition {
  code: string;
  module: string;
  description: string;
  minRole: RoleName;
  /** Admin-only, System-scope grant instead of the normal role-hierarchy scope. */
  systemOnly?: true;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // organization ------------------------------------------------------------
  {
    code: "organization.view",
    module: "organization",
    description: "View Organization / Region / Branch / Department / Team structure.",
    minRole: "Caller",
  },
  {
    code: "organization.manage",
    module: "organization",
    description:
      "Create or update the Organization record itself (name, code, status, timezone) — platform/root-scope configuration, distinct from managing Regions/Branches/Departments/Teams within an existing Organization.",
    minRole: "Admin",
    systemOnly: true,
  },
  {
    code: "team.manage",
    module: "organization",
    description: "Create, update, or archive Teams.",
    minRole: "Manager",
  },
  {
    code: "branch.manage",
    module: "organization",
    description: "Create, update, or archive Branches and Regions.",
    minRole: "Manager",
  },
  {
    code: "department.manage",
    module: "organization",
    description: "Create, update, or archive Departments.",
    minRole: "Admin",
  },
  {
    code: "escalation_rule.manage",
    module: "organization",
    description: "Configure overdue-obligation escalation rules.",
    minRole: "Admin",
  },

  // users --------------------------------------------------------------------
  {
    code: "user.view",
    module: "users",
    description: "View User profiles and Role assignments.",
    minRole: "Team Leader",
  },
  {
    code: "user.manage",
    module: "users",
    description: "Create, update, or suspend User accounts.",
    minRole: "Manager",
  },
  {
    code: "api_key.manage",
    module: "users",
    description: "Issue and revoke API Keys for inbound integrations.",
    minRole: "Admin",
  },
  {
    code: "user.impersonate",
    module: "users",
    description: "Temporarily act as another User for support/debugging (Audit-logged).",
    minRole: "Admin",
    systemOnly: true,
  },

  // rbac -----------------------------------------------------------------------
  {
    code: "permission.view",
    module: "rbac",
    description: "View the Permission catalog.",
    minRole: "Admin",
    systemOnly: true,
  },
  {
    code: "role.manage",
    module: "rbac",
    description: "Create or update Roles.",
    minRole: "Admin",
    systemOnly: true,
  },
  {
    code: "role_permission.manage",
    module: "rbac",
    description: "Grant or revoke a Permission (and its Data Scope) on a Role.",
    minRole: "Admin",
    systemOnly: true,
  },

  // customers --------------------------------------------------------------
  {
    code: "customer.view",
    module: "customers",
    description: "View Customer identity records.",
    minRole: "Caller",
  },
  {
    code: "customer.create",
    module: "customers",
    description: "Create a new Customer.",
    minRole: "Caller",
  },
  {
    code: "customer.update",
    module: "customers",
    description: "Update Customer contact/identity details.",
    minRole: "Caller",
  },
  {
    code: "customer.merge",
    module: "customers",
    description: "Merge two duplicate Customer identities.",
    minRole: "Manager",
  },
  {
    code: "customer.identifier.unmask",
    module: "customers",
    description:
      "View an unmasked PAN/Aadhaar value (platform-contracts.md §3 — requires its own explicit grant).",
    minRole: "Manager",
  },

  // leads --------------------------------------------------------------------
  { code: "lead.view", module: "leads", description: "View Leads.", minRole: "Caller" },
  { code: "lead.create", module: "leads", description: "Create a new Lead.", minRole: "Caller" },
  {
    code: "lead.update",
    module: "leads",
    description: "Update Lead details/stage.",
    minRole: "Caller",
  },
  {
    code: "lead.call_feedback.record",
    module: "leads",
    description: "Log Call Feedback against a Lead.",
    minRole: "Caller",
  },
  {
    code: "saved_view.manage",
    module: "leads",
    description: "Create/share Saved Views over the Lead list.",
    minRole: "Caller",
  },
  {
    code: "lead.reassign",
    module: "leads",
    description: "Reassign a Lead to another Caller.",
    minRole: "Team Leader",
  },
  {
    code: "tag.manage",
    module: "leads",
    description: "Create and apply Tags.",
    minRole: "Team Leader",
  },
  {
    code: "lead.import",
    module: "leads",
    description: "Bulk-import Leads via an Import Batch.",
    minRole: "Manager",
  },
  {
    code: "custom_field.manage",
    module: "leads",
    description: "Define Lead custom fields.",
    minRole: "Admin",
  },

  // follow_ups -----------------------------------------------------------------
  {
    code: "follow_up.view",
    module: "follow_ups",
    description: "View Follow-ups / Call Later tasks.",
    minRole: "Caller",
  },
  {
    code: "follow_up.create",
    module: "follow_ups",
    description: "Schedule a Follow-up.",
    minRole: "Caller",
  },
  {
    code: "follow_up.complete",
    module: "follow_ups",
    description: "Mark a Follow-up complete with an outcome.",
    minRole: "Caller",
  },
  {
    code: "follow_up.reassign",
    module: "follow_ups",
    description: "Reassign a Follow-up to another Caller.",
    minRole: "Team Leader",
  },

  // campaigns ------------------------------------------------------------------
  {
    code: "campaign.view",
    module: "campaigns",
    description: "View Campaigns and membership.",
    minRole: "Team Leader",
  },
  {
    code: "campaign.assign",
    module: "campaigns",
    description: "Trigger a Campaign Assignment allocation run.",
    minRole: "Team Leader",
  },
  {
    code: "campaign.manage",
    module: "campaigns",
    description: "Create/update Campaigns and memberships.",
    minRole: "Manager",
  },

  // banks ------------------------------------------------------------------
  {
    code: "bank.view",
    module: "banks",
    description: "View Bank / Bank Branch lending-partner records.",
    minRole: "Caller",
  },
  {
    code: "bank.manage",
    module: "banks",
    description: "Onboard or update Bank and Bank Branch records.",
    minRole: "Admin",
  },
  {
    code: "commission_policy.publish",
    module: "banks",
    description: "Publish a new Effective Commission Policy Version.",
    minRole: "Admin",
  },

  // loan_products ---------------------------------------------------------
  {
    code: "loan_product.view",
    module: "loan_products",
    description: "View the Loan Product catalog.",
    minRole: "Caller",
  },
  {
    code: "loan_product.manage",
    module: "loan_products",
    description: "Create, update, or retire Loan Products.",
    minRole: "Admin",
  },

  // loan_applications ------------------------------------------------------
  {
    code: "loan_application.view",
    module: "loan_applications",
    description: "View Loan Applications.",
    minRole: "Caller",
  },
  {
    code: "loan_application.create",
    module: "loan_applications",
    description: "Submit a new Loan Application.",
    minRole: "Caller",
  },
  {
    code: "eligibility.compute",
    module: "loan_applications",
    description: "Run an Eligibility Snapshot computation.",
    minRole: "Caller",
  },
  {
    code: "loan_offer.manage",
    module: "loan_applications",
    description: "Generate and present Loan Offers.",
    minRole: "Manager",
  },
  {
    code: "loan_application.decide",
    module: "loan_applications",
    description: "Approve or reject a Loan Application.",
    minRole: "Manager",
  },

  // loan_accounts -----------------------------------------------------------
  {
    code: "loan_account.view",
    module: "loan_accounts",
    description: "View Loan Accounts and EMI schedules.",
    minRole: "Caller",
  },
  {
    code: "loan_account.manage",
    module: "loan_accounts",
    description: "Update Loan Account status / regenerate an EMI schedule.",
    minRole: "Manager",
  },
  {
    code: "foreclosure.manage",
    module: "loan_accounts",
    description: "Process a Loan Account foreclosure request.",
    minRole: "Manager",
  },

  // disbursements ------------------------------------------------------------
  {
    code: "disbursement.view",
    module: "disbursements",
    description: "View Disbursements and Commissions.",
    minRole: "Manager",
  },
  {
    code: "disbursement.record",
    module: "disbursements",
    description: "Record a funds-release Disbursement event.",
    minRole: "Manager",
  },
  {
    code: "commission.view",
    module: "disbursements",
    description: "View DSA Commission accrual/invoicing.",
    minRole: "Manager",
  },
  {
    code: "disbursement.reconcile",
    module: "disbursements",
    description: "Reconcile a Disbursement against bank records.",
    minRole: "Admin",
  },
  {
    code: "commission.reconcile",
    module: "disbursements",
    description: "Reconcile or claw back a Commission.",
    minRole: "Admin",
  },

  // telephony ------------------------------------------------------------------
  {
    code: "call.initiate",
    module: "telephony",
    description: "Place an outbound Call Attempt.",
    minRole: "Caller",
  },
  {
    code: "call.view",
    module: "telephony",
    description: "View own Call Attempt history.",
    minRole: "Caller",
  },
  {
    code: "call.monitor",
    module: "telephony",
    description: "Listen / Whisper / Barge on a live Call.",
    minRole: "Team Leader",
  },
  {
    code: "agent_session.manage",
    module: "telephony",
    description: "View/manage Agent Session and Queue participation.",
    minRole: "Team Leader",
  },
  {
    code: "call.recording.access",
    module: "telephony",
    description: "Play back a Call Recording (Audit-logged, never anonymous).",
    minRole: "Manager",
  },
  {
    code: "dialer_campaign.manage",
    module: "telephony",
    description: "Configure Dialer Campaigns and trunk pools.",
    minRole: "Admin",
  },
  {
    code: "call.update",
    module: "telephony",
    description: "Transition a Call Attempt's lifecycle status and record its Call Outcome.",
    minRole: "Caller",
  },
  {
    code: "call.note.manage",
    module: "telephony",
    description: "Add or edit a Call Note against a Call Attempt.",
    minRole: "Caller",
  },
  {
    code: "call.recording.log",
    module: "telephony",
    description: "Record/update Call Recording metadata (file reference, duration, provider metadata) — distinct from `call.recording.access` (playback).",
    minRole: "Caller",
  },
  {
    code: "call.outcome.manage",
    module: "telephony",
    description: "Create, update, or retire entries in the configurable Call Outcome catalog.",
    minRole: "Admin",
  },
  {
    code: "agent_session.self",
    module: "telephony",
    description: "Log into/out of one's own Agent Session and change one's own availability status.",
    minRole: "Caller",
  },
  {
    code: "telephony.dashboard.view",
    module: "telephony",
    description: "View the Telephony Dashboard (Calls Today, Connected/Missed, Calls by Agent, Recent Calls).",
    minRole: "Team Leader",
  },

  // documents ------------------------------------------------------------------
  {
    code: "document.view",
    module: "documents",
    description: "View Documents and Checklists.",
    minRole: "Caller",
  },
  {
    code: "document.upload",
    module: "documents",
    description: "Upload an Attachment / submit a Document.",
    minRole: "Caller",
  },
  {
    code: "document.verify",
    module: "documents",
    description: "Verify or reject a submitted Document.",
    minRole: "Team Leader",
  },
  {
    code: "document.share",
    module: "documents",
    description: "Create a time-boxed external Document Sharing link.",
    minRole: "Team Leader",
  },
  {
    code: "retention_policy.manage",
    module: "documents",
    description: "Configure Document retention rules.",
    minRole: "Admin",
  },
  {
    code: "legal_hold.manage",
    module: "documents",
    description: "Apply or lift a Legal Hold on a Document.",
    minRole: "Admin",
  },

  // notifications --------------------------------------------------------------
  {
    code: "notification.send",
    module: "notifications",
    description: "Trigger an ad-hoc Notification send.",
    minRole: "Team Leader",
  },
  {
    code: "broadcast.manage",
    module: "notifications",
    description: "Create or schedule a Broadcast.",
    minRole: "Manager",
  },
  {
    code: "notification.template.manage",
    module: "notifications",
    description: "Create/publish Notification Templates.",
    minRole: "Admin",
  },
  {
    code: "provider.manage",
    module: "notifications",
    description: "Configure Notification Provider / Channel integrations.",
    minRole: "Admin",
    systemOnly: true,
  },

  // reports ----------------------------------------------------------------
  {
    code: "report.view",
    module: "reports",
    description: "View Reports, Dashboards, and KPIs.",
    minRole: "Team Leader",
  },
  {
    code: "report.manage",
    module: "reports",
    description: "Create/schedule Report Templates and Saved Reports.",
    minRole: "Manager",
  },
  {
    code: "dashboard.manage",
    module: "reports",
    description: "Build/publish Dashboards and widgets.",
    minRole: "Manager",
  },
  {
    code: "export.create",
    module: "reports",
    description: "Export a Report Execution / Analytics Dataset to file.",
    minRole: "Manager",
  },
  {
    code: "analytics_dataset.manage",
    module: "reports",
    description: "Define Analytics Datasets and Metric Definitions.",
    minRole: "Admin",
    systemOnly: true,
  },

  // audit (cross-cutting; owning tables live in documents / notifications / ai_core)
  {
    code: "audit.view",
    module: "audit",
    description:
      "Read-only access to Audit Trail / Communication Log / AI Audit Log — never write or delete (platform-contracts.md §4).",
    minRole: "Admin",
    systemOnly: true,
  },
];

export interface RoleGrant {
  permissionCode: string;
  role: RoleName;
  scope: DataScopeValue;
}

/** Expands PERMISSION_CATALOG's `minRole`/`systemOnly` shorthand into the full Role x Permission x Scope grant list RolePermission rows are seeded from. */
export function computeRoleGrants(): RoleGrant[] {
  const grants: RoleGrant[] = [];
  const roles = ROLE_DEFINITIONS.map((r) => r.name);

  for (const permission of PERMISSION_CATALOG) {
    if (permission.systemOnly) {
      grants.push({ permissionCode: permission.code, role: "Admin", scope: "SYSTEM" });
      continue;
    }
    for (const role of roles) {
      if (ROLE_TIER[role] >= ROLE_TIER[permission.minRole]) {
        grants.push({ permissionCode: permission.code, role, scope: ROLE_NATURAL_SCOPE[role] });
      }
    }
  }

  return grants;
}
