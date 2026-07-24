import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(800px 400px at 50% 0%, color-mix(in srgb, var(--danger) 12%, transparent), transparent), var(--background)",
      }}
    >
      <div className="mx-card mx-page w-full max-w-md p-8 text-center">
        <p className="text-danger text-xs font-semibold tracking-wider uppercase">403</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Access denied</h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          You do not have permission to view this page. If you believe this is a mistake, contact
          your administrator.
        </p>
        <Link href="/" className="mx-btn mx-btn-primary mt-6 inline-flex">
          Back to home
        </Link>
      </div>
    </div>
  );
}
