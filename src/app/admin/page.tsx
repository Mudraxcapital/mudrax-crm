import Link from "next/link";
import { requireRole } from "@/infra/auth/session";

// Demonstrates middleware's admin-route protection requirement. Full Admin
// configuration screens (Role/Permission management, etc.) are CRM-feature
// work explicitly out of scope for this task — this page only proves the
// guard (requireRole -> /unauthorized redirect for non-Admins).
export default async function AdminPage() {
  const { session } = await requireRole("Admin");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Back
      </Link>
      <div>
        <h1 className="text-lg font-semibold">Admin area</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Only Users holding the Admin Role can reach this page — welcome, {session.user.fullName}.
        </p>
      </div>
    </div>
  );
}
