"use client";
import { useTransition } from "react";
import { submitLoanApplicationAction } from "../controllers/submitLoanApplication.action";

export function SubmitApplicationButton({ applicationId }: { applicationId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      onClick={() => start(async () => { await submitLoanApplicationAction(applicationId); })}
    >
      {pending ? "Submitting…" : "Submit application"}
    </button>
  );
}
