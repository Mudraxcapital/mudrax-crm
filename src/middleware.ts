// Next.js requires middleware.ts at the project root (or, when using a
// `src/app` directory, directly inside `src/`) with a literal `matcher`
// config it can statically analyze — the actual guard logic lives in
// src/infra/middleware, per infra/middleware/README.md.
export { default } from "@/infra/middleware";

export const config = {
  matcher: [
    // Every path except Next.js internals and common static asset extensions.
    "/((?!_next/static|_next/image|downloads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|apk)$).*)",
  ],
};
