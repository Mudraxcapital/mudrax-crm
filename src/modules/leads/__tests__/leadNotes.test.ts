import { beforeEach, describe, expect, it } from "vitest";
import { makeAddLeadNote } from "../application/use-cases/addLeadNote";
import { makeUpdateLeadNote } from "../application/use-cases/updateLeadNote";
import { makeListLeadNotes } from "../application/use-cases/listLeadNotes";
import { LeadNoteNotFoundError, LeadNotFoundError } from "../domain/errors/LeadErrors";
import { FakeLeadRepository } from "./fakeLeadRepository";
import { FakeLeadNoteRepository } from "./fakeLeadNoteRepository";
import { ORG_ID, SOURCE_WEBSITE, STAGE_NEW } from "./fakeLeadCatalogRepository";

describe("Lead Notes", () => {
  let leadRepository: FakeLeadRepository;
  let noteRepository: FakeLeadNoteRepository;
  let addLeadNote: ReturnType<typeof makeAddLeadNote>;
  let updateLeadNote: ReturnType<typeof makeUpdateLeadNote>;
  let listLeadNotes: ReturnType<typeof makeListLeadNotes>;
  let leadId: string;

  beforeEach(async () => {
    leadRepository = new FakeLeadRepository();
    noteRepository = new FakeLeadNoteRepository();
    addLeadNote = makeAddLeadNote(leadRepository, noteRepository);
    updateLeadNote = makeUpdateLeadNote(noteRepository);
    listLeadNotes = makeListLeadNotes(noteRepository);

    const lead = await leadRepository.createWithAudit(
      {
        organizationId: ORG_ID,
        customerId: "customer-1",
        leadSourceId: SOURCE_WEBSITE.id,
        currentStageId: STAGE_NEW.id,
        fullNameSnapshot: "Rahul Sharma",
      },
      { actorType: "USER", actorId: "actor-1" },
    );
    leadId = lead.id;
  });

  it("adds a Note to a Lead", async () => {
    const note = await addLeadNote({
      leadId,
      authorUserId: "user-1",
      input: { body: "Called, left voicemail." },
      actor: { actorType: "USER", actorId: "user-1" },
    });

    expect(note.body).toBe("Called, left voicemail.");
    const notes = await listLeadNotes(leadId);
    expect(notes).toHaveLength(1);
  });

  it("rejects adding a Note to a non-existent Lead", async () => {
    await expect(
      addLeadNote({
        leadId: "does-not-exist",
        authorUserId: "user-1",
        input: { body: "Note" },
        actor: { actorType: "USER", actorId: "user-1" },
      }),
    ).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it("edits an existing Note's body, tracked via before/after Audit state", async () => {
    const note = await addLeadNote({
      leadId,
      authorUserId: "user-1",
      input: { body: "Original text" },
      actor: { actorType: "USER", actorId: "user-1" },
    });

    const updated = await updateLeadNote({
      id: note.id,
      input: { body: "Corrected text" },
      actor: { actorType: "USER", actorId: "user-1" },
    });

    expect(updated.body).toBe("Corrected text");
    const auditEntry = noteRepository.auditLog.find((entry) => entry.action === "LeadNoteUpdated");
    expect((auditEntry?.beforeState as { body: string } | null)?.body).toBe("Original text");
    expect((auditEntry?.afterState as { body: string } | null)?.body).toBe("Corrected text");
  });

  it("rejects editing a non-existent Note", async () => {
    await expect(
      updateLeadNote({
        id: "does-not-exist",
        input: { body: "Text" },
        actor: { actorType: "USER", actorId: "user-1" },
      }),
    ).rejects.toBeInstanceOf(LeadNoteNotFoundError);
  });
});
