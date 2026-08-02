import { hasAnyPermission, hasPermissionCode } from "@mudrax/shared";
import { useShallow } from "zustand/react/shallow";
import { useSessionStore } from "@/features/auth/store/sessionStore";

const EMPTY_STRINGS: string[] = [];

export function useAuthMe() {
  return useSessionStore((s) => s.me);
}

export function usePermissionCodes(): string[] {
  return useSessionStore((s) => s.me?.permissions ?? EMPTY_STRINGS);
}

export function useHasPermission(code: string): boolean {
  const permissions = usePermissionCodes();
  return hasPermissionCode(permissions, code);
}

export function useHasAnyPermission(codes: readonly string[]): boolean {
  const permissions = usePermissionCodes();
  return hasAnyPermission(permissions, codes);
}

export function useIsCallerWorkspace(): boolean {
  return useSessionStore((s) => s.me?.isCallerWorkspace ?? false);
}

export function useRoleNames(): string[] {
  return useSessionStore(
    useShallow((s) => {
      if (!s.me?.roles?.length) return EMPTY_STRINGS;
      return s.me.roles.map((role) => role.name);
    }),
  );
}
