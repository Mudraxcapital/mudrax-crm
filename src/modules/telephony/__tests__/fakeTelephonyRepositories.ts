// ============================================================================
// src/modules/telephony/__tests__/fakeTelephonyRepositories.ts
//
// In-memory repository doubles for use-case unit tests — see leads'
// fakeLeadRepository.ts's identical doc comment/rationale.
// ============================================================================

import type {
  CallAttemptRepository,
  CallsByAgentEntry,
  CreateCallAttemptData,
  ListCallAttemptsFilter,
  UpdateCallStatusData,
} from "../domain/repositories/CallAttemptRepository";
import type { CallAttempt, CallStatus } from "../domain/entities/CallAttempt";
import { MISSED_CALL_STATUSES } from "../domain/entities/CallAttempt";
import type {
  CallNoteRepository,
  CreateCallNoteData,
} from "../domain/repositories/CallNoteRepository";
import type { CallNote } from "../domain/entities/CallNote";
import type {
  CallOutcomeRepository,
  CreateCallOutcomeData,
  UpdateCallOutcomeData,
} from "../domain/repositories/CallOutcomeRepository";
import type { CallOutcome } from "../domain/entities/CallOutcome";
import type {
  AgentSessionRepository,
  ListAgentSessionsFilter,
  StartAgentSessionData,
} from "../domain/repositories/AgentSessionRepository";
import type {
  AgentSession,
  AgentSessionStatus,
  AgentStatusHistory,
} from "../domain/entities/AgentSession";
import type {
  CallRecordingRepository,
  CreateCallRecordingData,
  UpdateCallRecordingData,
} from "../domain/repositories/CallRecordingRepository";
import type { CallRecording } from "../domain/entities/CallRecording";
import type {
  CreateExtensionData,
  ExtensionRepository,
} from "../domain/repositories/ExtensionRepository";
import type { Extension } from "../domain/entities/Extension";
import type {
  TelephonyAuditActor,
  TelephonyAuditRecord,
} from "../domain/entities/TelephonyAuditRecord";

let nextId = 1;
function makeId(): string {
  return `00000000-0000-0000-0009-${String(nextId++).padStart(12, "0")}`;
}

function recordAudit(
  log: TelephonyAuditRecord[],
  actor: TelephonyAuditActor,
  action: string,
  targetType: string,
  targetId: string,
  organizationId: string,
  correlationId: string | null | undefined,
  beforeState: Record<string, unknown> | null,
  afterState: Record<string, unknown> | null,
): void {
  const previous = log[log.length - 1];
  log.push({
    id: makeId(),
    organizationId,
    occurredAt: new Date(),
    actorType: actor.actorType,
    actorId: actor.actorId,
    action,
    targetType,
    targetId,
    correlationId: correlationId ?? null,
    beforeState,
    afterState,
    recordHash: `fake-hash-${log.length}`,
    previousRecordHash: previous?.recordHash ?? null,
  });
}

export class FakeCallAttemptRepository implements CallAttemptRepository {
  calls = new Map<string, CallAttempt>();
  auditLog: TelephonyAuditRecord[] = [];

  async findById(id: string): Promise<CallAttempt | null> {
    return this.calls.get(id) ?? null;
  }

  async list(organizationId: string, filter?: ListCallAttemptsFilter): Promise<CallAttempt[]> {
    let results = [...this.calls.values()].filter((call) => call.organizationId === organizationId);
    if (filter?.leadId) results = results.filter((call) => call.leadId === filter.leadId);
    if (filter?.customerId)
      results = results.filter((call) => call.customerId === filter.customerId);
    if (filter?.agentUserIds?.length) {
      results = results.filter(
        (call) => !!call.agentUserId && filter.agentUserIds!.includes(call.agentUserId),
      );
    } else if (filter?.agentUserId) {
      results = results.filter((call) => call.agentUserId === filter.agentUserId);
    }
    if (filter?.missedOnly) {
      results = results.filter((call) => MISSED_CALL_STATUSES.includes(call.status));
    } else if (filter?.status) {
      results = results.filter((call) => call.status === filter.status);
    }
    return results;
  }

  async listByLead(leadId: string): Promise<CallAttempt[]> {
    return [...this.calls.values()].filter((call) => call.leadId === leadId);
  }

  async listByCustomer(customerId: string): Promise<CallAttempt[]> {
    return [...this.calls.values()].filter((call) => call.customerId === customerId);
  }

  async count(organizationId: string, filter?: ListCallAttemptsFilter): Promise<number> {
    return (await this.list(organizationId, filter)).length;
  }

  async createWithAudit(
    data: CreateCallAttemptData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallAttempt> {
    const now = new Date();
    const id = makeId();
    const call: CallAttempt = {
      id,
      organizationId: data.organizationId,
      leadId: data.leadId,
      customerId: data.customerId,
      agentUserId: data.agentUserId,
      direction: data.direction,
      status: data.status,
      disposition: null,
      callOutcomeId: null,
      retryOfCallAttemptId: data.retryOfCallAttemptId ?? null,
      callerIdUsed: data.callerIdUsed ?? null,
      providerCallId: data.providerCallId ?? null,
      initiatedAt: now,
      answeredAt: null,
      endedAt: null,
      durationSeconds: null,
      createdAt: now,
      updatedAt: now,
    };
    this.calls.set(id, call);
    recordAudit(
      this.auditLog,
      actor,
      "CallAttemptCreated",
      "CallAttempt",
      id,
      call.organizationId,
      correlationId,
      null,
      { ...call },
    );
    return call;
  }

  async updateStatusWithAudit(
    id: string,
    data: UpdateCallStatusData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallAttempt> {
    const existing = this.calls.get(id);
    if (!existing) throw new Error(`FakeCallAttemptRepository: CallAttempt ${id} not found`);
    const updated: CallAttempt = {
      ...existing,
      status: data.status,
      disposition: data.disposition !== undefined ? data.disposition : existing.disposition,
      callOutcomeId: data.callOutcomeId !== undefined ? data.callOutcomeId : existing.callOutcomeId,
      answeredAt: data.answeredAt !== undefined ? data.answeredAt : existing.answeredAt,
      endedAt: data.endedAt !== undefined ? data.endedAt : existing.endedAt,
      durationSeconds:
        data.durationSeconds !== undefined ? data.durationSeconds : existing.durationSeconds,
      updatedAt: new Date(),
    };
    this.calls.set(id, updated);
    recordAudit(
      this.auditLog,
      actor,
      "CallAttemptStatusChanged",
      "CallAttempt",
      id,
      updated.organizationId,
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }

  async listAuditLog(callAttemptId: string): Promise<TelephonyAuditRecord[]> {
    return this.auditLog.filter(
      (entry) => entry.targetType === "CallAttempt" && entry.targetId === callAttemptId,
    );
  }

  async listRecentAuditLog(organizationId: string, limit: number): Promise<TelephonyAuditRecord[]> {
    return this.auditLog.filter((entry) => entry.organizationId === organizationId).slice(0, limit);
  }

  async countInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    filter?: { statuses?: CallStatus[] },
  ): Promise<number> {
    return [...this.calls.values()].filter(
      (call) =>
        call.organizationId === organizationId &&
        call.initiatedAt >= range.from &&
        call.initiatedAt <= range.to &&
        (!filter?.statuses || filter.statuses.includes(call.status)),
    ).length;
  }

  async averageDurationInRange(
    organizationId: string,
    range: { from: Date; to: Date },
  ): Promise<number | null> {
    const durations = [...this.calls.values()]
      .filter(
        (call) =>
          call.organizationId === organizationId &&
          call.initiatedAt >= range.from &&
          call.initiatedAt <= range.to &&
          call.durationSeconds !== null,
      )
      .map((call) => call.durationSeconds as number);
    if (durations.length === 0) return null;
    return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
  }

  async countByAgentInRange(
    organizationId: string,
    range: { from: Date; to: Date },
  ): Promise<CallsByAgentEntry[]> {
    const counts = new Map<string | null, number>();
    for (const call of this.calls.values()) {
      if (call.organizationId !== organizationId) continue;
      if (call.initiatedAt < range.from || call.initiatedAt > range.to) continue;
      counts.set(call.agentUserId, (counts.get(call.agentUserId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([agentUserId, count]) => ({ agentUserId, count }))
      .sort((a, b) => b.count - a.count);
  }

  async listRecent(organizationId: string, limit: number): Promise<CallAttempt[]> {
    return [...this.calls.values()]
      .filter((call) => call.organizationId === organizationId)
      .sort((a, b) => b.initiatedAt.getTime() - a.initiatedAt.getTime())
      .slice(0, limit);
  }
}

export class FakeCallNoteRepository implements CallNoteRepository {
  notes = new Map<string, CallNote>();
  auditLog: TelephonyAuditRecord[] = [];

  async findById(id: string): Promise<CallNote | null> {
    return this.notes.get(id) ?? null;
  }

  async listByCallAttempt(callAttemptId: string): Promise<CallNote[]> {
    return [...this.notes.values()].filter((note) => note.callAttemptId === callAttemptId);
  }

  async createWithAudit(
    data: CreateCallNoteData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallNote> {
    const now = new Date();
    const id = makeId();
    const note: CallNote = { id, ...data, createdAt: now, updatedAt: now };
    this.notes.set(id, note);
    recordAudit(this.auditLog, actor, "CallNoteAdded", "CallNote", id, "n/a", correlationId, null, {
      ...note,
    });
    return note;
  }

  async updateWithAudit(
    id: string,
    body: string,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallNote> {
    const existing = this.notes.get(id);
    if (!existing) throw new Error(`FakeCallNoteRepository: CallNote ${id} not found`);
    const updated: CallNote = { ...existing, body, updatedAt: new Date() };
    this.notes.set(id, updated);
    recordAudit(
      this.auditLog,
      actor,
      "CallNoteUpdated",
      "CallNote",
      id,
      "n/a",
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }
}

export class FakeCallOutcomeRepository implements CallOutcomeRepository {
  outcomes = new Map<string, CallOutcome>();
  auditLog: TelephonyAuditRecord[] = [];

  async findById(id: string): Promise<CallOutcome | null> {
    return this.outcomes.get(id) ?? null;
  }

  async findByName(organizationId: string, name: string): Promise<CallOutcome | null> {
    return (
      [...this.outcomes.values()].find(
        (outcome) => outcome.organizationId === organizationId && outcome.name === name,
      ) ?? null
    );
  }

  async list(organizationId: string): Promise<CallOutcome[]> {
    return [...this.outcomes.values()]
      .filter((outcome) => outcome.organizationId === organizationId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createWithAudit(
    data: CreateCallOutcomeData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallOutcome> {
    const now = new Date();
    const id = makeId();
    const outcome: CallOutcome = {
      id,
      organizationId: data.organizationId,
      name: data.name,
      isActive: true,
      sortOrder: data.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    this.outcomes.set(id, outcome);
    recordAudit(
      this.auditLog,
      actor,
      "CallOutcomeCreated",
      "CallOutcome",
      id,
      data.organizationId,
      correlationId,
      null,
      { ...outcome },
    );
    return outcome;
  }

  async updateWithAudit(
    id: string,
    data: UpdateCallOutcomeData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallOutcome> {
    const existing = this.outcomes.get(id);
    if (!existing) throw new Error(`FakeCallOutcomeRepository: CallOutcome ${id} not found`);
    const updated: CallOutcome = { ...existing, ...data, updatedAt: new Date() };
    this.outcomes.set(id, updated);
    recordAudit(
      this.auditLog,
      actor,
      "CallOutcomeUpdated",
      "CallOutcome",
      id,
      existing.organizationId,
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }
}

export class FakeAgentSessionRepository implements AgentSessionRepository {
  sessions = new Map<string, AgentSession>();
  statusHistory = new Map<string, AgentStatusHistory[]>();
  auditLog: TelephonyAuditRecord[] = [];

  async findById(id: string): Promise<AgentSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async findActiveByUserId(userId: string): Promise<AgentSession | null> {
    return (
      [...this.sessions.values()].find(
        (session) => session.userId === userId && session.status !== "LOGGED_OUT",
      ) ?? null
    );
  }

  async list(organizationId: string, filter?: ListAgentSessionsFilter): Promise<AgentSession[]> {
    let results = [...this.sessions.values()].filter(
      (session) => session.organizationId === organizationId,
    );
    if (filter?.userId) results = results.filter((session) => session.userId === filter.userId);
    if (filter?.activeOnly) results = results.filter((session) => session.status !== "LOGGED_OUT");
    return results;
  }

  async startWithAudit(
    data: StartAgentSessionData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<AgentSession> {
    const now = new Date();
    const id = makeId();
    const session: AgentSession = {
      id,
      organizationId: data.organizationId,
      userId: data.userId,
      extensionId: data.extensionId,
      status: "LOGGED_IN",
      remoteAgentContext: data.remoteAgentContext ?? null,
      loginAt: now,
      logoutAt: null,
    };
    this.sessions.set(id, session);
    this.statusHistory.set(id, [
      { id: makeId(), agentSessionId: id, status: "LOGGED_IN", changedAt: now },
    ]);
    recordAudit(
      this.auditLog,
      actor,
      "AgentSessionStarted",
      "AgentSession",
      id,
      session.organizationId,
      correlationId,
      null,
      { ...session },
    );
    return session;
  }

  async changeStatusWithAudit(
    id: string,
    status: AgentSessionStatus,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<AgentSession> {
    const existing = this.sessions.get(id);
    if (!existing) throw new Error(`FakeAgentSessionRepository: AgentSession ${id} not found`);
    const updated: AgentSession = { ...existing, status };
    this.sessions.set(id, updated);
    const history = this.statusHistory.get(id) ?? [];
    history.push({ id: makeId(), agentSessionId: id, status, changedAt: new Date() });
    this.statusHistory.set(id, history);
    recordAudit(
      this.auditLog,
      actor,
      "AgentSessionStatusChanged",
      "AgentSession",
      id,
      updated.organizationId,
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }

  async endWithAudit(
    id: string,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<AgentSession> {
    const existing = this.sessions.get(id);
    if (!existing) throw new Error(`FakeAgentSessionRepository: AgentSession ${id} not found`);
    const updated: AgentSession = { ...existing, status: "LOGGED_OUT", logoutAt: new Date() };
    this.sessions.set(id, updated);
    const history = this.statusHistory.get(id) ?? [];
    history.push({ id: makeId(), agentSessionId: id, status: "LOGGED_OUT", changedAt: new Date() });
    this.statusHistory.set(id, history);
    recordAudit(
      this.auditLog,
      actor,
      "AgentSessionEnded",
      "AgentSession",
      id,
      updated.organizationId,
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }

  async listStatusHistory(agentSessionId: string): Promise<AgentStatusHistory[]> {
    return this.statusHistory.get(agentSessionId) ?? [];
  }

  async listAuditLog(agentSessionId: string): Promise<TelephonyAuditRecord[]> {
    return this.auditLog.filter(
      (entry) => entry.targetType === "AgentSession" && entry.targetId === agentSessionId,
    );
  }
}

export class FakeCallRecordingRepository implements CallRecordingRepository {
  recordings = new Map<string, CallRecording>();
  auditLog: TelephonyAuditRecord[] = [];

  async findById(id: string): Promise<CallRecording | null> {
    return this.recordings.get(id) ?? null;
  }

  async listByCallAttempt(callAttemptId: string): Promise<CallRecording[]> {
    return [...this.recordings.values()].filter(
      (recording) => recording.callAttemptId === callAttemptId,
    );
  }

  async createWithAudit(
    data: CreateCallRecordingData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallRecording> {
    const now = new Date();
    const id = makeId();
    const recording: CallRecording = {
      id,
      callAttemptId: data.callAttemptId,
      storageReference: data.storageReference,
      durationSeconds: data.durationSeconds ?? null,
      providerMetadata: data.providerMetadata ?? null,
      startedAt: data.startedAt,
      endedAt: data.endedAt ?? null,
      createdAt: now,
    };
    this.recordings.set(id, recording);
    recordAudit(
      this.auditLog,
      actor,
      "CallRecordingLogged",
      "CallRecording",
      id,
      "n/a",
      correlationId,
      null,
      { ...recording },
    );
    return recording;
  }

  async updateWithAudit(
    id: string,
    data: UpdateCallRecordingData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallRecording> {
    const existing = this.recordings.get(id);
    if (!existing) throw new Error(`FakeCallRecordingRepository: CallRecording ${id} not found`);
    const updated: CallRecording = { ...existing, ...data };
    this.recordings.set(id, updated);
    recordAudit(
      this.auditLog,
      actor,
      "CallRecordingUpdated",
      "CallRecording",
      id,
      "n/a",
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }

  async listAuditLog(callRecordingId: string): Promise<TelephonyAuditRecord[]> {
    return this.auditLog.filter(
      (entry) => entry.targetType === "CallRecording" && entry.targetId === callRecordingId,
    );
  }
}

export class FakeExtensionRepository implements ExtensionRepository {
  extensions = new Map<string, Extension>();

  async findById(id: string): Promise<Extension | null> {
    return this.extensions.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<Extension | null> {
    return [...this.extensions.values()].find((extension) => extension.userId === userId) ?? null;
  }

  async create(data: CreateExtensionData): Promise<Extension> {
    const now = new Date();
    const id = makeId();
    const extension: Extension = {
      id,
      organizationId: data.organizationId,
      userId: data.userId,
      extensionNumber: data.extensionNumber,
      isRemote: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.extensions.set(id, extension);
    return extension;
  }
}
