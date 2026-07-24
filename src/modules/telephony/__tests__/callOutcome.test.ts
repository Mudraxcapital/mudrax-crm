import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateCallOutcome } from "../application/use-cases/createCallOutcome";
import { makeUpdateCallOutcome } from "../application/use-cases/updateCallOutcome";
import { makeGetCallOutcome, makeListCallOutcomes } from "../application/use-cases/getCallOutcome";
import {
  CallOutcomeNotFoundError,
  DuplicateCallOutcomeNameError,
} from "../domain/errors/TelephonyErrors";
import { FakeCallOutcomeRepository } from "./fakeTelephonyRepositories";

const ORG_ID = "00000000-0000-0000-0001-000000000000";

describe("Call Outcome catalog", () => {
  let repository: FakeCallOutcomeRepository;
  let createCallOutcome: ReturnType<typeof makeCreateCallOutcome>;
  let updateCallOutcome: ReturnType<typeof makeUpdateCallOutcome>;
  let getCallOutcome: ReturnType<typeof makeGetCallOutcome>;
  let listCallOutcomes: ReturnType<typeof makeListCallOutcomes>;

  beforeEach(() => {
    repository = new FakeCallOutcomeRepository();
    createCallOutcome = makeCreateCallOutcome(repository);
    updateCallOutcome = makeUpdateCallOutcome(repository);
    getCallOutcome = makeGetCallOutcome(repository);
    listCallOutcomes = makeListCallOutcomes(repository);
  });

  it("creates a Call Outcome", async () => {
    const outcome = await createCallOutcome({
      organizationId: ORG_ID,
      input: { name: "Interested", sortOrder: 1 },
      actor: { actorType: "USER", actorId: "admin-1" },
    });

    expect(outcome.name).toBe("Interested");
    expect(outcome.isActive).toBe(true);

    const found = await getCallOutcome(outcome.id);
    expect(found.id).toBe(outcome.id);
  });

  it("rejects a duplicate Call Outcome name within the same Organization", async () => {
    await createCallOutcome({
      organizationId: ORG_ID,
      input: { name: "Interested" },
      actor: { actorType: "USER", actorId: "admin-1" },
    });

    await expect(
      createCallOutcome({
        organizationId: ORG_ID,
        input: { name: "Interested" },
        actor: { actorType: "USER", actorId: "admin-1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateCallOutcomeNameError);
  });

  it("updates a Call Outcome's name and active flag", async () => {
    const outcome = await createCallOutcome({
      organizationId: ORG_ID,
      input: { name: "Callback Later" },
      actor: { actorType: "USER", actorId: "admin-1" },
    });

    const updated = await updateCallOutcome({
      id: outcome.id,
      input: { name: "Call Back Later", isActive: false },
      actor: { actorType: "USER", actorId: "admin-1" },
    });

    expect(updated.name).toBe("Call Back Later");
    expect(updated.isActive).toBe(false);
  });

  it("lists all Call Outcomes for an Organization sorted by sortOrder", async () => {
    await createCallOutcome({
      organizationId: ORG_ID,
      input: { name: "Second", sortOrder: 2 },
      actor: { actorType: "USER", actorId: "admin-1" },
    });
    await createCallOutcome({
      organizationId: ORG_ID,
      input: { name: "First", sortOrder: 1 },
      actor: { actorType: "USER", actorId: "admin-1" },
    });

    const outcomes = await listCallOutcomes(ORG_ID);
    expect(outcomes.map((o) => o.name)).toEqual(["First", "Second"]);
  });

  it("rejects updating a non-existent Call Outcome", async () => {
    await expect(
      updateCallOutcome({
        id: "does-not-exist",
        input: { name: "X" },
        actor: { actorType: "USER", actorId: "admin-1" },
      }),
    ).rejects.toBeInstanceOf(CallOutcomeNotFoundError);
  });
});
