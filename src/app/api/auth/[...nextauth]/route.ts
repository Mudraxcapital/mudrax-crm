// Auth.js v5 Route Handler — handles /api/auth/signin, /callback, /session,
// /csrf, /signout, etc. Thin: all real logic lives in src/infra/auth.
import { handlers } from "@/infra/auth";

export const { GET, POST } = handlers;
