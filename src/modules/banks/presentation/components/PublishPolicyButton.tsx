"use client";

import { useTransition } from "react";
import { publishCommissionPolicyAction } from "../controllers/publishCommissionPolicy.action";

export function PublishPolicyButton({ bankId, policyId }: { bankId: string; policyId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="underline underline-offset-4 disabled:opacity-60"
      onClick={() => start(async () => { await publishCommissionPolicyAction(bankId, policyId); })}
    >
      {pending ? "Publishing…" : "Publish"}
    </button>
  );
}
