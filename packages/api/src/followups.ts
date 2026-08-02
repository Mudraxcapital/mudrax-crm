import { DEFAULT_PAGE_OFFSET, DEFAULT_PAGE_SIZE } from "@mudrax/shared";
import type { Followup, FollowupListResponse, FollowupResponse } from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface ListFollowupsParams {
  limit?: number;
  offset?: number;
}

export interface CreateFollowupInput {
  leadId: string;
  triggerType: "FOLLOW_UP" | "CALL_LATER";
  scheduledFor: string;
  currentAssigneeUserId?: string;
}

export interface UpdateFollowupInput {
  triggerType?: "FOLLOW_UP" | "CALL_LATER";
  scheduledFor?: string;
  outcomeNotes?: string | null;
}

export interface CompleteFollowupInput {
  outcomeNotes?: string | null;
}

export interface FollowupsApi {
  list: (params?: ListFollowupsParams) => Promise<FollowupListResponse>;
  getById: (id: string) => Promise<Followup>;
  create: (input: CreateFollowupInput) => Promise<Followup>;
  update: (id: string, input: UpdateFollowupInput) => Promise<Followup>;
  complete: (id: string, input?: CompleteFollowupInput) => Promise<Followup>;
}

export function createFollowupsApi(http: AxiosInstance): FollowupsApi {
  return {
    async list(params = {}) {
      try {
        const { data } = await http.get<FollowupListResponse>("/api/follow-ups", {
          params: {
            limit: params.limit ?? DEFAULT_PAGE_SIZE,
            offset: params.offset ?? DEFAULT_PAGE_OFFSET,
          },
        });
        return data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getById(id) {
      try {
        const { data } = await http.get<FollowupResponse>(`/api/follow-ups/${id}`);
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async create(input) {
      try {
        const { data } = await http.post<FollowupResponse>("/api/follow-ups", input);
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async update(id, input) {
      try {
        const { data } = await http.patch<FollowupResponse>(`/api/follow-ups/${id}`, input);
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async complete(id, input = {}) {
      try {
        const { data } = await http.post<FollowupResponse>(
          `/api/follow-ups/${id}/complete`,
          input,
        );
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
