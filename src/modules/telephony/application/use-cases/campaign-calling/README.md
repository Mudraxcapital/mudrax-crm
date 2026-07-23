# application/use-cases/campaign-calling

Telephony execution for outbound calling initiatives. CRM Campaign lifecycle,
membership, and Lead allocation decisions belong to `campaigns` (which
initiates assignment through `leads`, never writing Lead state directly);
Campaign Analytics belongs to `reports`. This use-case area owns only call
execution/Dialer Campaign behavior for Users authorized through `rbac`.
