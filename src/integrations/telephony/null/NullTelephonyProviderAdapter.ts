// ============================================================================
// src/integrations/telephony/null/NullTelephonyProviderAdapter.ts
//
// The only `ITelephonyProvider` (telephony module's TelephonyProviderPort)
// implementation wired today. Per this task's scope, it fabricates a
// deterministic provider call id without placing a real call or contacting
// any vendor (Twilio/Exotel/Knowlarity are explicitly excluded). A future
// PR adds a real vendor adapter alongside this one, behind the same port —
// no domain/use-case/presentation code changes required (ADR 0006).
// ============================================================================

import { randomUUID } from "node:crypto";
import type {
  OriginateCallInput,
  OriginateCallResult,
  TelephonyProviderPort,
} from "@/modules/telephony/application/ports/TelephonyProviderPort";

export class NullTelephonyProviderAdapter implements TelephonyProviderPort {
  async originateCall(input: OriginateCallInput): Promise<OriginateCallResult> {
    void input;
    return { providerCallId: `null-provider-${randomUUID()}` };
  }
}
