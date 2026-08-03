import type {
  CallDisposition,
  CallRecording,
  CreateCallRecordingInput,
  InitiateCallInput,
} from "@mudrax/types";
import { getLocalCallRecordingPath } from "mudrax-call-log";
import { getApi } from "@/core/api";
import type { CallRecordingSnapshot } from "@/features/calling/services/callRecording";

export function logCallAttempt(input: InitiateCallInput) {
  return getApi().telephony.initiateCall(input);
}

/** Recordings for a lead (via recent call attempts). Newest first. */
export async function listLeadCallRecordings(leadId: string): Promise<CallRecording[]> {
  const calls = await getApi().telephony.listCalls({ leadId, limit: 15 });
  const batches = await Promise.all(
    calls.map(async (call) => {
      try {
        return await getApi().telephony.listRecordings(call.id);
      } catch {
        return [] as CallRecording[];
      }
    }),
  );
  return batches
    .flat()
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

export interface CompleteCallOptions {
  disposition: CallDisposition;
  /**
   * For connected calls: talk/connected seconds (Android CallLog.DURATION).
   * For missed dials: ringing/dial seconds for audit only.
   */
  durationSeconds?: number;
  /** When true, call is treated as connected for talk-time reporting. */
  connected?: boolean;
}

/**
 * Completes a click-to-call attempt.
 * Connected calls stamp talk time; missed dials may still store dial duration.
 */
export function completeCallDisposition(
  callAttemptId: string,
  options: CallDisposition | CompleteCallOptions,
) {
  const opts: CompleteCallOptions =
    typeof options === "string" ? { disposition: options } : options;

  const connected =
    opts.connected ??
    (opts.disposition === "ANSWERED" || opts.disposition === "VOICEMAIL");

  const terminalStatus = connected
    ? "COMPLETED"
    : opts.disposition === "NO_ANSWER" ||
        opts.disposition === "BUSY" ||
        opts.disposition === "FAILED" ||
        opts.disposition === "CONGESTION"
      ? opts.disposition
      : "COMPLETED";

  return getApi().telephony.updateCall(callAttemptId, {
    status: terminalStatus,
    disposition: opts.disposition,
    ...(typeof opts.durationSeconds === "number"
      ? { durationSeconds: Math.max(0, Math.round(opts.durationSeconds)) }
      : {}),
  });
}

/**
 * Logs Android recording metadata, then uploads the audio file to CRM storage
 * so Web CRM can play it. DB still stores only a storage reference (ADR 0006).
 */
export async function logCallRecording(
  callAttemptId: string,
  snapshot: CallRecordingSnapshot,
): Promise<CallRecording> {
  if (!snapshot.storageReference) {
    throw new Error("Recording file reference is missing.");
  }
  const startedAt =
    snapshot.startedAtMs > 0
      ? new Date(snapshot.startedAtMs).toISOString()
      : new Date().toISOString();
  const endedAt =
    snapshot.endedAtMs > 0 ? new Date(snapshot.endedAtMs).toISOString() : undefined;

  const input: CreateCallRecordingInput = {
    storageReference: snapshot.storageReference,
    durationSeconds: Math.max(0, Math.round(snapshot.durationSeconds || 0)),
    startedAt,
    endedAt,
    providerMetadata: {
      platform: "android",
      source: "android-dialer-sync",
      audioSource: snapshot.audioSource,
      localFilePath: snapshot.filePath,
      captureMode: "dialer-file-import",
      sourceFileName: snapshot.sourceFileName ?? null,
    },
  };

  const created = await getApi().telephony.createRecording(callAttemptId, input);

  const localPath =
    snapshot.filePath || getLocalCallRecordingPath(snapshot.storageReference);
  if (!localPath) {
    return created;
  }

  const fileName =
    localPath.split(/[/\\]/).pop() ||
    snapshot.storageReference.split("/").pop() ||
    "recording.m4a";
  const uri = localPath.startsWith("file://") ? localPath : `file://${localPath}`;
  const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "m4a";
  const mimeByExt: Record<string, string> = {
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    aac: "audio/aac",
    amr: "audio/amr",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    "3gp": "audio/3gpp",
    ogg: "audio/ogg",
  };

  try {
    return await getApi().telephony.uploadRecordingAudio(callAttemptId, created.id, {
      uri,
      name: fileName,
      type: mimeByExt[ext] ?? "audio/mp4",
    });
  } catch {
    // Metadata is already saved; upload can be retried later. Keep local ref.
    return created;
  }
}
