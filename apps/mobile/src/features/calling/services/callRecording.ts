import { PermissionsAndroid, Platform } from "react-native";
import {
  armCallRecording,
  disarmCallRecording,
  hasLocalCallRecording,
  isCallLogVerificationAvailable,
  isCallRecordingAvailable,
  playLocalCallRecording,
  stopLocalCallRecordingPlayback,
  type CallRecordingSnapshot,
  type LocalRecordingPlaybackResult,
} from "mudrax-call-log";

export type { CallRecordingSnapshot, LocalRecordingPlaybackResult };

/** Native module linked and platform is Android (permission may still be missing). */
export function canUseAndroidCallRecording(): boolean {
  return Platform.OS === "android" && isCallLogVerificationAvailable();
}

export async function ensureCallRecordingPermissions(): Promise<boolean> {
  if (!canUseAndroidCallRecording()) return false;

  const recordGranted = await ensurePermission(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: "Allow microphone access",
      message:
        "Mudrax can record outbound CRM calls on this Android phone so supervisors can review them later. You can deny and still place calls.",
      buttonPositive: "Allow",
      buttonNegative: "Deny",
    },
  );
  if (!recordGranted) return false;

  const phoneStateGranted = await ensurePermission(
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    {
      title: "Allow phone state access",
      message:
        "Mudrax needs phone state access to start and stop recording when your call connects and ends.",
      buttonPositive: "Allow",
      buttonNegative: "Deny",
    },
  );
  return phoneStateGranted;
}

/**
 * Best-effort arm. Never throws — call placement must continue even if
 * recording cannot start.
 */
export async function tryArmCallRecording(phone: string): Promise<boolean> {
  if (!canUseAndroidCallRecording()) return false;
  try {
    const permitted = await ensureCallRecordingPermissions();
    if (!permitted) return false;
    // isCallRecordingAvailable reflects current RECORD_AUDIO grant after request.
    if (!isCallRecordingAvailable()) return false;
    const digits = phone.replace(/\D/g, "");
    const snap = await armCallRecording(digits);
    return Boolean(snap?.armed || snap?.state === "armed");
  } catch {
    return false;
  }
}

/**
 * Best-effort disarm. Returns a completed snapshot when a file was captured.
 */
export async function tryDisarmCallRecording(): Promise<CallRecordingSnapshot | null> {
  if (!canUseAndroidCallRecording()) return null;
  try {
    return await disarmCallRecording();
  } catch {
    return null;
  }
}

async function ensurePermission(
  permission: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS],
  rationale: {
    title: string;
    message: string;
    buttonPositive: string;
    buttonNegative: string;
  },
): Promise<boolean> {
  const existing = await PermissionsAndroid.check(permission);
  if (existing) return true;
  const result = await PermissionsAndroid.request(permission, rationale);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export { isCallRecordingAvailable };

export function canPlayLocalRecording(storageReference: string): boolean {
  return hasLocalCallRecording(storageReference);
}

export async function playStoredCallRecording(
  storageReference: string,
): Promise<LocalRecordingPlaybackResult> {
  return playLocalCallRecording(storageReference);
}

export async function stopStoredCallRecordingPlayback(): Promise<LocalRecordingPlaybackResult> {
  return stopLocalCallRecordingPlayback();
}
