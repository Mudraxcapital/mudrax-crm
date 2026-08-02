import type { CreateFollowupInput, UpdateFollowupInput } from "@mudrax/api";
import { getApi } from "@/core/api";

export function listFollowups() {
  return getApi().followups.list({ limit: 200, offset: 0 });
}

export function createFollowup(input: CreateFollowupInput) {
  return getApi().followups.create(input);
}

export function updateFollowup(id: string, input: UpdateFollowupInput) {
  return getApi().followups.update(id, input);
}

export function completeFollowup(id: string, outcomeNotes?: string | null) {
  return getApi().followups.complete(id, { outcomeNotes });
}
