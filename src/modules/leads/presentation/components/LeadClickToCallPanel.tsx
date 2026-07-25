"use client";

import { useActionState } from "react";
import {
  initiateClickToCallAction,
  type TelephonyFormState,
} from "@/modules/telephony/presentation/controllers/initiateClickToCall.action";

const initialState: TelephonyFormState = {};

export function LeadClickToCallPanel({
  leadId,
  customerId,
  phone,
  agentUserId,
}: {
  leadId: string;
  customerId: string;
  phone: string | null;
  agentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(initiateClickToCallAction, initialState);

  if (!phone) {
    return <p className="text-muted text-sm">No phone number on this lead.</p>;
  }

  return (
    <form id="call" action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="agentUserId" value={agentUserId} />
      <input type="hidden" name="toPhoneNumber" value={phone} />
      <p className="text-sm">
        Call <span className="font-medium">{phone}</span>
      </p>
      <button type="submit" disabled={pending} className="mx-btn mx-btn-primary self-start">
        {pending ? "Connecting…" : "Click to Call"}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
