import { hasPermission, type AuthorizationContext } from "@/modules/rbac";

export function telephonyTabItems(authContext: AuthorizationContext): {
  href: string;
  label: string;
}[] {
  const items: { href: string; label: string }[] = [];

  if (hasPermission(authContext, "telephony.dashboard.view")) {
    items.push({ href: "/telephony", label: "Overview" });
  }
  if (hasPermission(authContext, "call.view")) {
    items.push({ href: "/telephony/calls", label: "Calls" });
    items.push({ href: "/telephony/missed-calls", label: "Missed" });
  }
  if (
    hasPermission(authContext, "agent_session.self") ||
    hasPermission(authContext, "agent_session.manage")
  ) {
    items.push({ href: "/telephony/agent-sessions", label: "Agents" });
  }
  if (hasPermission(authContext, "call.outcome.manage")) {
    items.push({ href: "/telephony/outcomes", label: "Outcomes" });
  }

  return items;
}
