import { useEffect } from "react";
import { useSessionStore } from "@/store";

/** Hydrates Auth.js session token from SecureStore on app launch. */
export function useBootstrapSession(): boolean {
  const hydrate = useSessionStore((s) => s.hydrate);
  const isHydrated = useSessionStore((s) => s.isHydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return isHydrated;
}
