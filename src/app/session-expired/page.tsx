import Link from "next/link";

export default function SessionExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold">Session expired</h1>
        <p className="text-foreground/60 mt-2 text-sm">
          For your security, you have been signed out after a period of inactivity. Please sign in
          again to continue.
        </p>
        <Link
          href="/login"
          className="bg-foreground text-background mt-6 inline-block rounded-lg px-4 py-2.5 text-sm font-medium"
        >
          Sign in again
        </Link>
      </div>
    </div>
  );
}
