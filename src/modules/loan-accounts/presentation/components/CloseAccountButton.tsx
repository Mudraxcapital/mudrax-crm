"use client";
import { useTransition } from "react";
import { closeLoanAccountAction } from "../controllers/closeLoanAccount.action";

export function CloseAccountButton({ accountId }: { accountId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm disabled:opacity-60"
      onClick={() => start(async () => { await closeLoanAccountAction(accountId); })}
    >
      {pending ? "Closing…" : "Close account"}
    </button>
  );
}
