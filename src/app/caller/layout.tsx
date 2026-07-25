import type { ReactNode } from "react";
import { requireCallerWorkspace } from "@/infra/auth/session";

export default async function CallerLayout({ children }: { children: ReactNode }) {
  await requireCallerWorkspace();
  return children;
}
