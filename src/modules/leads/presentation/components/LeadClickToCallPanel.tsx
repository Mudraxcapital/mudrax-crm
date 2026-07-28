"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  /** When set, call stays on this path (Campaign Dashboard) instead of /telephony. */
  returnPath,
  compact = false,
  onCallStarted,
}: {
  leadId: string;
  customerId: string;
  phone: string | null;
  agentUserId: string;
  returnPath?: string;
  compact?: boolean;
  onCallStarted?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(initiateClickToCallAction, initialState);
  const handledCallId = useRef<string | null>(null);

  useEffect(() => {
    if (!state.callId || state.error) return;
    if (handledCallId.current === state.callId) return;
    handledCallId.current = state.callId;
    onCallStarted?.();
    if (returnPath) {
      router.refresh();
    }
  }, [state.callId, state.error, returnPath, router, onCallStarted]);

  if (!phone) {
    return <p className="text-muted text-sm">No phone number on this lead.</p>;
  }

  const callStarted = Boolean(state.callId && returnPath && !state.error);

  return (
    <form
      id="call"
      action={formAction}
      className={compact ? "inline-flex items-center gap-1.5" : "flex flex-col gap-3"}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="agentUserId" value={agentUserId} />
      <input type="hidden" name="toPhoneNumber" value={phone} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      {!compact ? (
        <p className="text-sm">
          Call <span className="font-medium">{phone}</span>
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={
          compact
            ? "mx-btn mx-btn-primary"
            : "mx-btn mx-btn-primary self-start"
        }
      >
        {pending ? "Connecting…" : compact ? "Call" : "Click to Call"}
      </button>
      {state.error ? (
        <p
          role="alert"
          className={
            compact
              ? "max-w-[10rem] truncate text-xs text-danger"
              : "text-sm text-danger"
          }
          title={state.error}
        >
          {state.error}
        </p>
      ) : null}
      {callStarted && !compact ? (
        <p className="text-muted text-xs" role="status">
          Call started — update status and add a note below.
        </p>
      ) : null}
      {callStarted && compact ? (
        <span className="text-muted text-xs whitespace-nowrap" role="status">
          Ringing
        </span>
      ) : null}
    </form>
  );
}
