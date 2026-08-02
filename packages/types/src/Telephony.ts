import type { CallAttempt, CallDisposition, CallStatus } from "./Caller";

export type { CallAttempt, CallDisposition, CallStatus };

export interface CallAttemptListResponse {
  data: CallAttempt[];
  meta?: { limit: number; offset: number };
}

export interface CallAttemptResponse {
  data: CallAttempt;
}

export interface InitiateCallInput {
  leadId?: string;
  customerId?: string;
  agentUserId?: string;
  toPhoneNumber?: string;
  callerIdUsed?: string;
}

export interface UpdateCallAttemptInput {
  status: CallStatus | string;
  disposition?: CallDisposition;
  callOutcomeId?: string | null;
  /** Optional client-measured duration in seconds (mobile dialer timing). */
  durationSeconds?: number;
}

export interface CallRecording {
  id: string;
  callAttemptId: string;
  storageReference: string;
  durationSeconds: number | null;
  providerMetadata: Record<string, unknown> | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface CreateCallRecordingInput {
  storageReference: string;
  durationSeconds?: number;
  providerMetadata?: Record<string, unknown>;
  startedAt: string;
  endedAt?: string;
}

export interface CallRecordingResponse {
  data: CallRecording;
}
