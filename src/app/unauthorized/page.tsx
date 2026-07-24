import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-foreground/60 mt-2 text-sm">
          You do not have permission to view this page. If you believe this is a mistake, contact
          your administrator.
        </p>
        <Link
          href="/"
          className="bg-foreground text-background mt-6 inline-block rounded-lg px-4 py-2.5 text-sm font-medium"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
