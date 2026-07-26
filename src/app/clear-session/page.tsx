import { ClearStaleSessionForm } from "@/modules/auth/presentation/components/ClearStaleSessionForm";
import { isSessionClearReason } from "@/modules/auth";

interface ClearSessionPageProps {
  searchParams: Promise<{ reason?: string }>;
}

/**
 * Bridge for Server Component redirects that need to clear the Auth.js cookie.
 * Cookie mutation happens via a POST Server Action (not GET).
 */
export default async function ClearSessionPage({ searchParams }: ClearSessionPageProps) {
  const { reason } = await searchParams;
  const allowed = isSessionClearReason(reason) ? reason : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <ClearStaleSessionForm reason={allowed} />
    </div>
  );
}
