import { PermissionsAndroid, Platform } from "react-native";
import {
  findLatestOutboundCall,
  getCallRecordingState,
  isCallLogVerificationAvailable,
  type OutboundCallLogMatch,
} from "mudrax-call-log";

export type { OutboundCallLogMatch };

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function ensureCallLogPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  if (!isCallLogVerificationAvailable()) return false;

  const existing = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  );
  if (existing) return true;

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    {
      title: "Allow call log access",
      message:
        "Mudrax needs call log access to log a call only after you actually place it from the dialer — not when the dial pad is merely opened.",
      buttonPositive: "Allow",
      buttonNegative: "Deny",
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export interface WaitForCallOptions {
  /** Stop waiting after this many ms (default 5 minutes). */
  timeoutMs?: number;
  /** Poll interval (default 1.5s). */
  intervalMs?: number;
  /** Abort signal from UI cancel. */
  signal?: { cancelled: boolean };
}

/**
 * Polls the device call log until an outbound call to `phone` has *ended*
 * after `sinceEpochMs`, or until timeout / cancel.
 *
 * Some OEMs insert a call-log row while the call is still ringing. We require
 * the duration to stay stable across two polls so we do not disarm recording
 * mid-call.
 */
export async function waitForVerifiedOutboundCall(
  phone: string,
  sinceEpochMs: number,
  options: WaitForCallOptions = {},
): Promise<OutboundCallLogMatch | null> {
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const intervalMs = options.intervalMs ?? 1500;
  const digits = digitsOnly(phone);
  if (!digits) return null;

  const deadline = Date.now() + timeoutMs;
  let lastMatch: OutboundCallLogMatch | null = null;
  let stableCount = 0;

  while (Date.now() < deadline) {
    if (options.signal?.cancelled) return null;
    try {
      const match = await findLatestOutboundCall(digits, sinceEpochMs);
      if (match) {
        const sameAsLast =
          lastMatch != null &&
          lastMatch.startedAtMs === match.startedAtMs &&
          lastMatch.durationSeconds === match.durationSeconds;

        if (sameAsLast) {
          stableCount += 1;
        } else {
          stableCount = 0;
          lastMatch = match;
        }

        // Duration can be 0 for instant hangups; stability means the row is final.
        if (stableCount >= 1) {
          return match;
        }
      }
    } catch {
      // Permission revoked mid-wait, or native error — keep trying briefly.
    }
    await sleep(intervalMs);
  }

  return lastMatch;
}

/**
 * Wait until native capture is no longer mid-recording (completed / failed /
 * idle / armed). Avoids disarming while MediaRecorder is still writing.
 */
export async function waitForRecordingSettled(
  options: WaitForCallOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const intervalMs = options.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (options.signal?.cancelled) return;
    const snap = getCallRecordingState();
    if (!snap || snap.state !== "recording") return;
    await sleep(intervalMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { isCallLogVerificationAvailable };
