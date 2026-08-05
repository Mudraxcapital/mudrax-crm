/** Seeded demo credentials — override via env in CI. */
export const e2eCredentials = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@localhost.dev",
    password:
      process.env.E2E_ADMIN_PASSWORD ??
      process.env.SEED_ADMIN_PASSWORD ??
      "ChangeMe-Admin-Dev-Only!",
  },
  manager: {
    email: process.env.E2E_MANAGER_EMAIL ?? "salaudin.malik@mudraxcapital.com",
    password:
      process.env.E2E_DEMO_PASSWORD ??
      process.env.SEED_DEMO_PASSWORD ??
      "ChangeMe-User-Dev-Only!",
  },
  teamLead: {
    email: process.env.E2E_TEAM_LEAD_EMAIL ?? "ananya.sharma@mudraxcapital.com",
    password:
      process.env.E2E_DEMO_PASSWORD ??
      process.env.SEED_DEMO_PASSWORD ??
      "ChangeMe-User-Dev-Only!",
  },
  caller: {
    // First generated caller under TL — email pattern from seed builder.
    email: process.env.E2E_CALLER_EMAIL ?? "aarav.sharma@mudraxcapital.com",
    password:
      process.env.E2E_DEMO_PASSWORD ??
      process.env.SEED_DEMO_PASSWORD ??
      "ChangeMe-User-Dev-Only!",
  },
} as const;
