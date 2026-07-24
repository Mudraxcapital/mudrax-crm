import { beforeEach, describe, expect, it } from "vitest";
import { makeUpdateCallAttemptStatus } from "../application/use-cases/updateCallAttemptStatus";
import {
  CallAttemptNotFoundError,
  InvalidCallOutcomeReferenceError,
  InvalidCallStatusTransitionError,
} from "../domain/errors/TelephonyErrors";
import { FakeCallAttemptRepository, FakeCallOutcomeRepository } from "./fakeTelephonyRepositories";

const ORG_ID = "00000000-0000-0000-0001-000000000000";

describe("updateCallAttemptStatus", () => {
  let repository: FakeCallAttemptRepository;
  let callOutcomeRepository: FakeCallOutcomeRepository;
  let updateCallAttemptStatus: ReturnType<typeof makeUpdateCallAttemptStatus>;

  beforeEach(() => {
    repository = new FakeCallAttemptRepository();
    callOutcomeRepository = new FakeCallOutcomeRepository();
    updateCallAttemptStatus = makeUpdateCallAttemptStatus(repository, callOutcomeRepository);
  });

  async function seedCall(status: "INITIATING" | "RINGING" | "ANSWERED" = "RINGING") {
    return repository.createWithAudit(
      {
        organizationId: ORG_ID,
        leadId: "lead-1",
        customerId: null,
        agentUserId: "agent-1",
        direction: "OUTBOUND",
        status,
      },
      { actorType: "USER", actorId: "agent-1" },
    );
  }

  it("transitions RINGING -> ANSWERED and stamps answeredAt", async () => {
    const call = await seedCall("RINGING");

    const dto = await updateCallAttemptStatus({
      id: call.id,
      input: { status: "ANSWERED" },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    expect(dto.status).toBe("ANSWERED");
    expect(dto.answeredAt).not.toBeNull();
  });

  it("transitions ANSWERED -> COMPLETED, stamps endedAt, and computes durationSeconds", async () => {
    const call = await seedCall("RINGING");
    await updateCallAttemptStatus({
      id: call.id,
      input: { status: "ANSWERED" },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    const dto = await updateCallAttemptStatus({
      id: call.id,
      input: { status: "COMPLETED" },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    expect(dto.status).toBe("COMPLETED");
    expect(dto.endedAt).not.toBeNull();
    expect(dto.durationSeconds).not.toBeNull();
  });

  it("records a Call Outcome against a terminal status", async () => {
    const outcome = await callOutcomeRepository.createWithAudit(
      { organizationId: ORG_ID, name: "Interested" },
      { actorType: "USER", actorId: "agent-1" },
    );
    const call = await seedCall("RINGING");
    await updateCallAttemptStatus({
      id: call.id,
      input: { status: "ANSWERED" },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    const dto = await updateCallAttemptStatus({
      id: call.id,
      input: { status: "COMPLETED", callOutcomeId: outcome.id },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    expect(dto.callOutcomeId).toBe(outcome.id);
    expect(dto.callOutcomeName).toBe("Interested");
  });

  it("rejects an illegal transition (e.g. COMPLETED -> RINGING)", async () => {
    const call = await seedCall("RINGING");
    await updateCallAttemptStatus({
      id: call.id,
      input: { status: "ANSWERED" },
      actor: { actorType: "USER", actorId: "agent-1" },
    });
    await updateCallAttemptStatus({
      id: call.id,
      input: { status: "COMPLETED" },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    await expect(
      updateCallAttemptStatus({
        id: call.id,
        input: { status: "RINGING" },
        actor: { actorType: "USER", actorId: "agent-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidCallStatusTransitionError);
  });

  it("rejects a Call Outcome reference from another Organization", async () => {
    const call = await seedCall("RINGING");
    await expect(
      updateCallAttemptStatus({
        id: call.id,
        input: { status: "NO_ANSWER", callOutcomeId: "does-not-exist" },
        actor: { actorType: "USER", actorId: "agent-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidCallOutcomeReferenceError);
  });

  it("rejects a status update for a non-existent Call Attempt", async () => {
    await expect(
      updateCallAttemptStatus({
        id: "does-not-exist",
        input: { status: "RINGING" },
        actor: { actorType: "USER", actorId: "agent-1" },
      }),
    ).rejects.toBeInstanceOf(CallAttemptNotFoundError);
  });
});
