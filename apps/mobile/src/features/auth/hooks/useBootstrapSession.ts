import { useEffect } from "react";
import { useSessionStore } from "@/features/auth/store/sessionStore";
import { useLeadWorkflowStore } from "@/features/leads/store/leadWorkflowStore";

/** Hydrates Auth.js session token from SecureStore on app launch. */
export function useBootstrapSession(): boolean {
  const hydrate = useSessionStore((s) => s.hydrate);
  const isHydrated = useSessionStore((s) => s.isHydrated);
  const hydrateWorkflow = useLeadWorkflowStore((s) => s.hydrate);
  const workflowHydrated = useLeadWorkflowStore((s) => s.isHydrated);

  useEffect(() => {
    void hydrate();
    void hydrateWorkflow();
  }, [hydrate, hydrateWorkflow]);

  return isHydrated && workflowHydrated;
}
