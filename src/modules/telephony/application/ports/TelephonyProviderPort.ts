// ============================================================================
// src/modules/telephony/application/ports/TelephonyProviderPort.ts
//
// The `ITelephonyProvider` port ADR 0006 requires all Click-to-Call domain
// logic to depend on instead of a specific vendor/protocol SDK: "Domain
// logic never depends on a specific vendor/protocol SDK... vendor- and
// protocol-specific dialing/signaling code lives entirely in
// src/integrations/telephony/*."
//
// This task explicitly implements the abstraction only — no real Twilio/
// Exotel/Knowlarity/PRI/GSM/SIP integration. The only implementation wired
// today is the Null adapter (src/integrations/telephony/null), which
// fabricates a deterministic provider call id without placing a real call,
// so a future PR can add a real adapter behind this same interface without
// touching any domain/use-case/presentation code.
// ============================================================================

export interface OriginateCallInput {
  organizationId: string;
  toPhoneNumber?: string | null;
  callerIdUsed?: string | null;
}

export interface OriginateCallResult {
  providerCallId: string;
}

export interface TelephonyProviderPort {
  /** Originates an outbound call for Click-to-Call. Returns the provider's own call identifier, stored on the Call Attempt for later correlation (e.g. webhook-driven status updates from a real provider). */
  originateCall(input: OriginateCallInput): Promise<OriginateCallResult>;
}
