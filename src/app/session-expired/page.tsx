import Link from "next/link";

export default function SessionExpiredPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(800px 400px at 50% 0%, color-mix(in srgb, var(--warning) 14%, transparent), transparent), var(--background)",
      }}
    >
      <div className="mx-card mx-page w-full max-w-md p-8 text-center">
        <p className="text-warning text-xs font-semibold tracking-wider uppercase">Session</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Session expired</h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          For your security, you have been signed out after a period of inactivity. Please sign in
          again to continue.
        </p>
        <Link href="/login" className="mx-btn mx-btn-primary mt-6 inline-flex">
          Sign in again
        </Link>
      </div>
    </div>
  );
}
