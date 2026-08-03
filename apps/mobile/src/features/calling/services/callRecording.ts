import { PermissionsAndroid, Platform } from "react-native";
import {
  clearDialerRecordingFolder,
  getDialerRecordingFolder,
  hasLocalCallRecording,
  importDialerCallRecording,
  isCallLogVerificationAvailable,
  isCallRecordingAvailable,
  pickDialerRecordingFolder,
  playLocalCallRecording,
  stopLocalCallRecordingPlayback,
  type CallRecordingSnapshot,
  type DialerRecordingFolderInfo,
  type LocalRecordingPlaybackResult,
} from "mudrax-call-log";

export type {
  CallRecordingSnapshot,
  DialerRecordingFolderInfo,
  LocalRecordingPlaybackResult,
};

/** Native module linked and platform is Android. */
export function canUseAndroidCallRecording(): boolean {
  return Platform.OS === "android" && isCallLogVerificationAvailable();
}

export function getDialerMediaPath(): DialerRecordingFolderInfo | null {
  if (!canUseAndroidCallRecording()) return null;
  return getDialerRecordingFolder();
}

export function isDialerMediaPathConfigured(): boolean {
  return Boolean(getDialerMediaPath()?.configured);
}

/** Ask the user to pick the dialer call-recording folder (TeleCRM Media Path). */
export async function chooseDialerMediaPath(): Promise<DialerRecordingFolderInfo | null> {
  if (!canUseAndroidCallRecording()) return null;
  try {
    return await pickDialerRecordingFolder();
  } catch {
    return null;
  }
}

export async function resetDialerMediaPath(): Promise<DialerRecordingFolderInfo | null> {
  if (!canUseAndroidCallRecording()) return null;
  try {
    return await clearDialerRecordingFolder();
  } catch {
    return null;
  }
}

/**
 * Ensure we can read recent audio from shared storage (MediaStore fallback).
 * Folder access itself uses a persisted SAF tree URI and does not need this.
 */
export async function ensureDialerRecordingPermissions(): Promise<boolean> {
  if (!canUseAndroidCallRecording()) return false;

  const audioPermission =
    Number(Platform.Version) >= 33
      ? (("READ_MEDIA_AUDIO" in PermissionsAndroid.PERMISSIONS
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
          : "android.permission.READ_MEDIA_AUDIO") as (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS])
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  return ensurePermission(audioPermission, {
    title: "Allow audio access",
    message:
      "Mudrax imports call recordings created by your phone dialer (Samsung Phone or ODialer) so supervisors can review CRM calls.",
    buttonPositive: "Allow",
    buttonNegative: "Deny",
  });
}

/**
 * After a verified outbound call, poll for the dialer's recording file and
 * import it into app storage. Dialers often finalize the file a few seconds
 * after hangup.
 */
export async function tryImportDialerCallRecording(
  phone: string,
  callStartedAtMs: number,
  durationSeconds: number,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
    signal?: { cancelled: boolean };
  } = {},
): Promise<CallRecordingSnapshot | null> {
  if (!canUseAndroidCallRecording()) return null;

  try {
    await ensureDialerRecordingPermissions();
  } catch {
    // Continue — SAF folder may still work without MediaStore permission.
  }

  const timeoutMs = options.timeoutMs ?? 45_000;
  const intervalMs = options.intervalMs ?? 1_500;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const deadline = Date.now() + timeoutMs;
  let lastError: string | null = null;

  while (Date.now() < deadline) {
    if (options.signal?.cancelled) return null;
    try {
      const snap = await importDialerCallRecording(
        digits,
        callStartedAtMs,
        durationSeconds,
      );
      if (snap?.storageReference) return snap;
      lastError = snap?.error ?? lastError;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Dialer import failed.";
    }
    await sleep(intervalMs);
  }

  return {
    state: "failed",
    armed: false,
    recording: false,
    filePath: null,
    storageReference: null,
    startedAtMs: callStartedAtMs,
    endedAtMs: 0,
    durationSeconds: Math.max(0, durationSeconds),
    audioSource: "DIALER_FILE",
    phoneDigits: digits,
    error:
      lastError ??
      "No dialer recording found. Enable Record all calls in Samsung Phone or ODialer and set Media Path in Mudrax.",
  };
}

/** @deprecated Mic arm removed from call flow — dialer sync is used instead. */
export async function tryArmCallRecording(_phone: string): Promise<boolean> {
  return isDialerMediaPathConfigured() || canUseAndroidCallRecording();
}

/** @deprecated No mic recorder to disarm; kept so cancel paths stay safe. */
export async function tryDisarmCallRecording(): Promise<CallRecordingSnapshot | null> {
  return null;
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
  if (!permission) return true;
  const existing = await PermissionsAndroid.check(permission);
  if (existing) return true;
  const result = await PermissionsAndroid.request(permission, rationale);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
