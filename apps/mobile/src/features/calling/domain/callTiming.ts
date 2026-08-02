import type { CallDisposition } from "@mudrax/types";

export function formatCallDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rem = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  }
  return `${minutes}:${String(rem).padStart(2, "0")}`;
}

export const CALL_RESULT_OPTIONS: Array<{
  value: CallDisposition;
  label: string;
  connected: boolean;
}> = [
  { value: "ANSWERED", label: "Connected", connected: true },
  { value: "NO_ANSWER", label: "No answer", connected: false },
  { value: "BUSY", label: "Busy", connected: false },
  { value: "FAILED", label: "Failed", connected: false },
  { value: "VOICEMAIL", label: "Voicemail", connected: true },
];

/** Ring presets (seconds) for manual adjustment when dial wall-clock is unavailable. */
export const RING_PRESETS_SECONDS = [0, 5, 10, 15, 30, 45, 60] as const;

/**
 * Android CallLog.DURATION is talk/connected time on modern devices (0 when the
 * remote never answered). Treat duration > 0 as a connected call.
 */
export function inferCallWasConnected(callLogDurationSeconds: number | null | undefined): boolean {
  return typeof callLogDurationSeconds === "number" && callLogDurationSeconds > 0;
}

export function inferCallResult(
  callLogDurationSeconds: number | null | undefined,
): CallDisposition {
  return inferCallWasConnected(callLogDurationSeconds) ? "ANSWERED" : "NO_ANSWER";
}

export interface CallTimingSplit {
  /** Connected talk seconds (call-log duration when verified). */
  talkSeconds: number;
  /** Estimated ringing / dialing before answer. */
  ringSeconds: number;
  /** Dial wall-clock (ring + talk), when known. */
  totalSeconds: number;
}

function asNonNegInt(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

/**
 * Split dial vs talk time.
 *
 * - Android CallLog.DURATION is talk time when the call connected.
 * - Dial wall-clock is ringing + talk.
 * - Ring = dial − talk (never talk = dial − guessed ring).
 */
export function splitCallTiming(input: {
  connected: boolean;
  /** Android CallLog.DURATION (talk time), when verified. */
  callLogDurationSeconds?: number | null;
  /** Wall-clock seconds from dial open → verification complete. */
  dialElapsedSeconds?: number | null;
  /** Optional manual ring override (presets). */
  ringOverrideSeconds?: number | null;
}): CallTimingSplit {
  const dial = asNonNegInt(input.dialElapsedSeconds);
  const logTalk = asNonNegInt(input.callLogDurationSeconds);
  const ringOverride = asNonNegInt(input.ringOverrideSeconds);

  if (!input.connected) {
    const ring = dial ?? logTalk ?? 0;
    return { talkSeconds: 0, ringSeconds: ring, totalSeconds: ring };
  }

  // Preferred path: call log talk is authoritative.
  if (logTalk != null && logTalk > 0) {
    const ring =
      ringOverride != null
        ? ringOverride
        : dial != null
          ? Math.max(0, dial - logTalk)
          : 0;
    return {
      talkSeconds: logTalk,
      ringSeconds: ring,
      totalSeconds: dial ?? logTalk + ring,
    };
  }

  // Agent marked Connected but call log talk is 0/missing (OEM quirk).
  const ring = ringOverride != null ? ringOverride : dial != null ? Math.min(10, dial) : 10;
  const talk = dial != null ? Math.max(0, dial - ring) : 0;
  return {
    talkSeconds: talk,
    ringSeconds: ring,
    totalSeconds: dial ?? talk + ring,
  };
}

/** Nearest ring preset for UI selection highlighting. */
export function nearestRingPreset(seconds: number): number {
  let best: number = RING_PRESETS_SECONDS[0];
  let bestDelta = Math.abs(seconds - best);
  for (const preset of RING_PRESETS_SECONDS) {
    const delta = Math.abs(seconds - preset);
    if (delta < bestDelta) {
      best = preset;
      bestDelta = delta;
    }
  }
  return best;
}
