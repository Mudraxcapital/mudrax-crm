export interface SimCardInfo {
  /** 0-based slot index used for Android dual-SIM intents. */
  slotIndex: number;
  /** Carrier / display label. */
  label: string;
  phoneNumber?: string | null;
  subscriptionId?: number | null;
}

export const CALL_DISPOSITION_OPTIONS = [
  { value: "ANSWERED", label: "Answered" },
  { value: "NO_ANSWER", label: "No answer" },
  { value: "BUSY", label: "Busy" },
  { value: "FAILED", label: "Failed" },
  { value: "VOICEMAIL", label: "Voicemail" },
  { value: "CONGESTION", label: "Congestion" },
] as const;
