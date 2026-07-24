import { beforeEach, describe, expect, it } from "vitest";
import { makeAddCallNote } from "../application/use-cases/addCallNote";
import { makeUpdateCallNote } from "../application/use-cases/updateCallNote";
import { makeListCallNotes } from "../application/use-cases/listCallNotes";
import { CallAttemptNotFoundError, CallNoteNotFoundError } from "../domain/errors/TelephonyErrors";
import { FakeCallAttemptRepository, FakeCallNoteRepository } from "./fakeTelephonyRepositories";

const ORG_ID = "00000000-0000-0000-0001-000000000000";

describe("Call Notes", () => {
  let callAttemptRepository: FakeCallAttemptRepository;
  let noteRepository: FakeCallNoteRepository;
  let addCallNote: ReturnType<typeof makeAddCallNote>;
  let updateCallNote: ReturnType<typeof makeUpdateCallNote>;
  let listCallNotes: ReturnType<typeof makeListCallNotes>;
  let callAttemptId: string;

  beforeEach(async () => {
    callAttemptRepository = new FakeCallAttemptRepository();
    noteRepository = new FakeCallNoteRepository();
    addCallNote = makeAddCallNote(callAttemptRepository, noteRepository);
    updateCallNote = makeUpdateCallNote(noteRepository);
    listCallNotes = makeListCallNotes(noteRepository);

    const call = await callAttemptRepository.createWithAudit(
      {
        organizationId: ORG_ID,
        leadId: "lead-1",
        customerId: null,
        agentUserId: "agent-1",
        direction: "OUTBOUND",
        status: "RINGING",
      },
      { actorType: "USER", actorId: "agent-1" },
    );
    callAttemptId = call.id;
  });

  it("adds a Call Note linked to the Call Attempt", async () => {
    const note = await addCallNote({
      callAttemptId,
      authorUserId: "agent-1",
      input: { body: "Customer requested a callback tomorrow." },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    expect(note.callAttemptId).toBe(callAttemptId);
    expect(note.body).toBe("Customer requested a callback tomorrow.");

    const notes = await listCallNotes(callAttemptId);
    expect(notes).toHaveLength(1);
  });

  it("rejects a Note against a non-existent Call Attempt", async () => {
    await expect(
      addCallNote({
        callAttemptId: "does-not-exist",
        authorUserId: "agent-1",
        input: { body: "Note" },
        actor: { actorType: "USER", actorId: "agent-1" },
      }),
    ).rejects.toBeInstanceOf(CallAttemptNotFoundError);
  });

  it("updates an existing Call Note's body", async () => {
    const note = await addCallNote({
      callAttemptId,
      authorUserId: "agent-1",
      input: { body: "Original body" },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    const updated = await updateCallNote({
      id: note.id,
      input: { body: "Corrected body" },
      actor: { actorType: "USER", actorId: "agent-1" },
    });

    expect(updated.body).toBe("Corrected body");
  });

  it("rejects updating a non-existent Call Note", async () => {
    await expect(
      updateCallNote({
        id: "does-not-exist",
        input: { body: "Body" },
        actor: { actorType: "USER", actorId: "agent-1" },
      }),
    ).rejects.toBeInstanceOf(CallNoteNotFoundError);
  });
});
