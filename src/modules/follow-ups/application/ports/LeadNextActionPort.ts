// ============================================================================
// src/modules/follow-ups/application/ports/LeadNextActionPort.ts
//
// Port (interface) this module depends on to maintain `leads`' denormalized
// "next action" projection (follow-ups.md — "maintained exclusively by a
// Follow-up domain-event listener. No other code path may write that
// projection."), without importing anything from `leads`' internal
// folders — only its public index.ts.
// ============================================================================

export interface LeadNextActionPort {
  updateNextAction(
    leadId: string,
    nextActionAt: Date | null,
    nextActionType: string | null,
  ): Promise<void>;
}
