import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateCallRecording } from "../application/use-cases/createCallRecording";
import { makeUpdateCallRecording } from "../application/use-cases/updateCallRecording";
import { makeGetCallRecording } from "../application/use-cases/getCallRecording";
import { CallAttemptNotFoundError, CallRecordingNotFoundError } from "../domain/errors/TelephonyErrors";
import { FakeCallAttemptRepository, FakeCallRecordingRepository } from "./fakeTelephonyRepositories";

const ORG_ID = "00000000-0000-0000-0001-000000000000";

describe("Call Recording metadata", () => {
  let callAttemptRepository: FakeCallAttemptRepository;
  let recordingRepository: FakeCallRecordingRepository;
  let createCallRecording: ReturnType<typeof makeCreateCallRecording>;
  let updateCallRecording: ReturnType<typeof makeUpdateCallRecording>;
  let getCallRecording: ReturnType<typeof makeGetCallRecording>;
  let callAttemptId: string;

  beforeEach(async () => {
    callAttemptRepository = new FakeCallAttemptRepository();
    recordingRepository = new FakeCallRecordingRepository();
    createCallRecording = makeCreateCallRecording(callAttemptRepository, recordingRepository);
    updateCallRecording = makeUpdateCallRecording(recordingRepository);
    getCallRecording = makeGetCallRecording(recordingRepository);

    const call = await callAttemptRepository.createWithAudit(
      {
        organizationId: ORG_ID,
        leadId: "lead-1",
        customerId: null,
        agentUserId: "agent-1",
        direction: "OUTBOUND",
        status: "ANSWERED",
      },
      { actorType: "USER", actorId: "agent-1" },
    );
    callAttemptId = call.id;
  });

  it("logs Recording Metadata: file reference, duration, timestamps, and provider metadata only", async () => {
    const recording = await createCallRecording({
      input: {
        callAttemptId,
        storageReference: "s3://recordings/call-1.wav",
        durationSeconds: 120,
        providerMetadata: { codec: "opus" },
        startedAt: new Date("2026-01-01T10:00:00Z"),
      },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    expect(recording.storageReference).toBe("s3://recordings/call-1.wav");
    expect(recording.durationSeconds).toBe(120);
    expect(recording.providerMetadata).toEqual({ codec: "opus" });

    const found = await getCallRecording(recording.id);
    expect(found.id).toBe(recording.id);
  });

  it("rejects logging a Recording against a non-existent Call Attempt", async () => {
    await expect(
      createCallRecording({
        input: {
          callAttemptId: "does-not-exist",
          storageReference: "s3://recordings/call-x.wav",
          startedAt: new Date(),
        },
        actor: { actorType: "USER", actorId: "agent-1" },
      }),
    ).rejects.toBeInstanceOf(CallAttemptNotFoundError);
  });

  it("updates a Recording's duration and endedAt", async () => {
    const recording = await createCallRecording({
      input: {
        callAttemptId,
        storageReference: "s3://recordings/call-1.wav",
        startedAt: new Date("2026-01-01T10:00:00Z"),
      },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    const updated = await updateCallRecording({
      id: recording.id,
      input: { durationSeconds: 300, endedAt: new Date("2026-01-01T10:05:00Z") },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    expect(updated.durationSeconds).toBe(300);
    expect(updated.endedAt).not.toBeNull();
  });

  it("rejects updating a non-existent Recording", async () => {
    await expect(
      updateCallRecording({
        id: "does-not-exist",
        input: { durationSeconds: 10 },
        actor: { actorType: "USER", actorId: "agent-1" },
      }),
    ).rejects.toBeInstanceOf(CallRecordingNotFoundError);
  });
});
