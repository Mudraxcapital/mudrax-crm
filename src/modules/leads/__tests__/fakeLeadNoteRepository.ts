// ============================================================================
// src/modules/leads/__tests__/fakeLeadNoteRepository.ts
// ============================================================================

import type {
  CreateLeadNoteData,
  LeadNoteRepository,
} from "../domain/repositories/LeadNoteRepository";
import type { LeadNote } from "../domain/entities/LeadNote";
import type { LeadAuditActor, LeadAuditRecord } from "../domain/entities/LeadAuditRecord";

let nextId = 1;

function makeId(): string {
  return `00000000-0000-0000-0006-${String(nextId++).padStart(12, "0")}`;
}

export class FakeLeadNoteRepository implements LeadNoteRepository {
  notes = new Map<string, LeadNote>();
  auditLog: LeadAuditRecord[] = [];

  async findById(id: string): Promise<LeadNote | null> {
    return this.notes.get(id) ?? null;
  }

  async listByLead(leadId: string): Promise<LeadNote[]> {
    return [...this.notes.values()]
      .filter((note) => note.leadId === leadId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listLatestBodyByLeadIds(leadIds: string[]): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    for (const leadId of new Set(leadIds)) {
      const notes = await this.listByLead(leadId);
      if (notes[0]) result.set(leadId, notes[0].body?.trim() || null);
    }
    return result;
  }

  async createWithAudit(
    data: CreateLeadNoteData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<LeadNote> {
    const note: LeadNote = { id: makeId(), ...data, createdAt: new Date() };
    this.notes.set(note.id, note);
    this.auditLog.push({
      id: makeId(),
      organizationId: "",
      occurredAt: new Date(),
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "LeadNoteAdded",
      targetType: "LeadNote",
      targetId: note.id,
      correlationId: correlationId ?? null,
      beforeState: null,
      afterState: { ...note },
      recordHash: `fake-hash-${this.auditLog.length}`,
      previousRecordHash: null,
    });
    return note;
  }

  async updateWithAudit(
    id: string,
    body: string,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<LeadNote> {
    const existing = this.notes.get(id);
    if (!existing) throw new Error(`FakeLeadNoteRepository: LeadNote ${id} not found`);
    const updated: LeadNote = { ...existing, body };
    this.notes.set(id, updated);
    this.auditLog.push({
      id: makeId(),
      organizationId: "",
      occurredAt: new Date(),
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "LeadNoteUpdated",
      targetType: "LeadNote",
      targetId: id,
      correlationId: correlationId ?? null,
      beforeState: { ...existing },
      afterState: { ...updated },
      recordHash: `fake-hash-${this.auditLog.length}`,
      previousRecordHash: null,
    });
    return updated;
  }
}
