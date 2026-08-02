import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

export interface OutboundCallLogMatch {
  number: string;
  startedAtMs: number;
  durationSeconds: number;
}

export type CallRecordingStateName =
  | "idle"
  | "armed"
  | "recording"
  | "completed"
  | "failed";

export interface CallRecordingSnapshot {
  state: CallRecordingStateName | string;
  armed: boolean;
  recording: boolean;
  filePath: string | null;
  storageReference: string | null;
  startedAtMs: number;
  endedAtMs: number;
  durationSeconds: number;
  audioSource: string | null;
  phoneDigits: string;
  error: string | null;
}

export interface LocalRecordingPlaybackResult {
  ok: boolean;
  playing: boolean;
  error: string | null;
  path?: string | null;
  durationSeconds?: number;
}

type MudraxCallLogNative = {
  isAvailable(): boolean;
  findLatestOutboundCall(
    phoneDigits: string,
    sinceEpochMs: number,
  ): Promise<OutboundCallLogMatch | null>;
  isCallRecordingAvailable(): boolean;
  getCallRecordingState(): CallRecordingSnapshot;
  armCallRecording(phoneDigits: string): Promise<CallRecordingSnapshot>;
  disarmCallRecording(): Promise<CallRecordingSnapshot>;
  hasLocalCallRecording(storageReference: string): boolean;
  getLocalCallRecordingPath(storageReference: string): string | null;
  playLocalCallRecording(
    storageReference: string,
  ): Promise<LocalRecordingPlaybackResult>;
  stopLocalCallRecordingPlayback(): Promise<LocalRecordingPlaybackResult>;
  isLocalCallRecordingPlaying(): boolean;
};

let native: MudraxCallLogNative | null = null;

function getNative(): MudraxCallLogNative | null {
  if (Platform.OS !== "android") return null;
  if (native) return native;
  try {
    native = requireNativeModule<MudraxCallLogNative>("MudraxCallLog");
    return native;
  } catch {
    return null;
  }
}

/** True when the native call-log module is linked (dev/production build, not Expo Go). */
export function isCallLogVerificationAvailable(): boolean {
  const mod = getNative();
  try {
    return Boolean(mod?.isAvailable());
  } catch {
    return false;
  }
}

export async function findLatestOutboundCall(
  phoneDigits: string,
  sinceEpochMs: number,
): Promise<OutboundCallLogMatch | null> {
  const mod = getNative();
  if (!mod) return null;
  return mod.findLatestOutboundCall(phoneDigits, sinceEpochMs);
}

/** Android only — false on iOS / Expo Go / missing RECORD_AUDIO. */
export function isCallRecordingAvailable(): boolean {
  const mod = getNative();
  try {
    return Boolean(mod?.isCallRecordingAvailable());
  } catch {
    return false;
  }
}

export function getCallRecordingState(): CallRecordingSnapshot | null {
  const mod = getNative();
  if (!mod) return null;
  try {
    return mod.getCallRecordingState();
  } catch {
    return null;
  }
}

/**
 * Arm phone-state-driven recording before opening the dialer.
 * Recording starts on OFFHOOK and stops on IDLE.
 */
export async function armCallRecording(
  phoneDigits: string,
): Promise<CallRecordingSnapshot | null> {
  const mod = getNative();
  if (!mod) return null;
  return mod.armCallRecording(phoneDigits);
}

/** Stop listening / recording and return the final snapshot (file path if any). */
export async function disarmCallRecording(): Promise<CallRecordingSnapshot | null> {
  const mod = getNative();
  if (!mod) return null;
  return mod.disarmCallRecording();
}

/** True when `android-local://call-recordings/...` exists in this app's files. */
export function hasLocalCallRecording(storageReference: string): boolean {
  const mod = getNative();
  if (!mod || !storageReference) return false;
  try {
    return Boolean(mod.hasLocalCallRecording(storageReference));
  } catch {
    return false;
  }
}

/** Absolute filesystem path for an on-device recording (for upload FormData). */
export function getLocalCallRecordingPath(storageReference: string): string | null {
  const mod = getNative();
  if (!mod || !storageReference) return null;
  try {
    return mod.getLocalCallRecordingPath(storageReference);
  } catch {
    return null;
  }
}

/** Play an on-device recording previously logged to CRM. */
export async function playLocalCallRecording(
  storageReference: string,
): Promise<LocalRecordingPlaybackResult> {
  const mod = getNative();
  if (!mod) {
    return {
      ok: false,
      playing: false,
      error: "Call recording playback requires the Android native build.",
    };
  }
  return mod.playLocalCallRecording(storageReference);
}

export async function stopLocalCallRecordingPlayback(): Promise<LocalRecordingPlaybackResult> {
  const mod = getNative();
  if (!mod) {
    return { ok: false, playing: false, error: "Native module unavailable." };
  }
  return mod.stopLocalCallRecordingPlayback();
}

export function isLocalCallRecordingPlaying(): boolean {
  const mod = getNative();
  if (!mod) return false;
  try {
    return Boolean(mod.isLocalCallRecordingPlaying());
  } catch {
    return false;
  }
}
