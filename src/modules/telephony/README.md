# Telephony Module - Enterprise Call Platform

Click-to-call, call queue, IVR, auto/predictive dialer, campaign calling, call monitoring (listen/whisper/barge-in), recording, and analytics - all built against a single `ITelephonyProvider` port.

Vendor/protocol specifics (GSM Gateway, Asterisk, FreePBX, SIP, hosted VoIP APIs) are pushed out to `src/integrations/telephony/*`, which implement `ITelephonyProvider`. This is what lets the provider be replaced without touching business logic.

Live call-center dashboard support: `Call`'s `CallStatus` value object models ringing/active/queued/on-hold/missed/completed states. Every transition raises a domain event forwarded by `infrastructure/realtime` onto the app-wide gateway (`src/infra/realtime`) for a future `(dashboard)/call-center` route.

**Never put here**: any direct dependency on a specific PBX/SIP/vendor SDK - that always belongs in `src/integrations/telephony/*`.
