/** Seeded demo credentials — override via env in CI. */
export const e2eCredentials = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? "aarush.taluja1@gmail.com",
    password: process.env.E2E_ADMIN_PASSWORD ?? "Sairam@123",
  },
  manager: {
    email: process.env.E2E_MANAGER_EMAIL ?? "salaudin.malik@mudraxcapital.com",
    password: process.env.E2E_DEMO_PASSWORD ?? "Mudrax@User2026!",
  },
  teamLead: {
    email: process.env.E2E_TEAM_LEAD_EMAIL ?? "ananya.sharma@mudraxcapital.com",
    password: process.env.E2E_DEMO_PASSWORD ?? "Mudrax@User2026!",
  },
  caller: {
    // First generated caller under TL — email pattern from seed builder.
    email: process.env.E2E_CALLER_EMAIL ?? "aarav.sharma@mudraxcapital.com",
    password: process.env.E2E_DEMO_PASSWORD ?? "Mudrax@User2026!",
  },
} as const;
