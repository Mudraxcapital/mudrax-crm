"use client";

import { useCallback, useState } from "react";
import { MobileAppCallRequiredDialog } from "@/modules/telephony/presentation/components/MobileAppCallRequiredDialog";

export function LeadClickToCallPanel({
  leadId: _leadId,
  customerId: _customerId,
  phone,
  agentUserId: _agentUserId,
  /** Kept for call-site compatibility; web calling redirects to the mobile app. */
  returnPath: _returnPath,
  compact = false,
  onCallStarted: _onCallStarted,
}: {
  leadId: string;
  customerId: string;
  phone: string | null;
  agentUserId: string;
  returnPath?: string;
  compact?: boolean;
  onCallStarted?: () => void;
}) {
  void _leadId;
  void _customerId;
  void _agentUserId;
  void _returnPath;
  void _onCallStarted;

  const [dialogOpen, setDialogOpen] = useState(false);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  if (!phone) {
    return <p className="text-muted text-sm">No phone number on this lead.</p>;
  }

  return (
    <div className={compact ? "inline-flex items-center gap-1.5" : "flex flex-col gap-3"}>
      {!compact ? (
        <p className="text-sm">
          Call <span className="font-medium">{phone}</span>
        </p>
      ) : null}
      <button
        type="button"
        className={
          compact
            ? "mx-btn mx-btn-primary"
            : "mx-btn mx-btn-primary self-start"
        }
        onClick={() => setDialogOpen(true)}
      >
        {compact ? "Call" : "Click to Call"}
      </button>
      <MobileAppCallRequiredDialog open={dialogOpen} onClose={closeDialog} />
    </div>
  );
}
