import { DEFAULT_PAGE_OFFSET, DEFAULT_PAGE_SIZE } from "@mudrax/shared";
import type {
  CallerCatalog,
  Lead,
  LeadListResponse,
  LeadNote,
  LeadResponse,
} from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface ListLeadsParams {
  limit?: number;
  offset?: number;
  campaignId?: string | null;
  assignedToUserId?: string | null;
  currentStageId?: string | null;
  search?: string | null;
}

export interface ChangeLeadStageInput {
  stageId: string;
  lostReasonId?: string;
}

export interface LeadsApi {
  list: (params?: ListLeadsParams) => Promise<LeadListResponse>;
  getCatalog: () => Promise<CallerCatalog>;
  getById: (id: string) => Promise<Lead>;
  listNotes: (id: string) => Promise<LeadNote[]>;
  addNote: (id: string, body: string) => Promise<LeadNote>;
  changeStage: (id: string, input: ChangeLeadStageInput) => Promise<Lead>;
}

export function createLeadsApi(http: AxiosInstance): LeadsApi {
  return {
    async list(params = {}) {
      try {
        const { data } = await http.get<LeadListResponse>("/api/leads", {
          params: {
            limit: params.limit ?? DEFAULT_PAGE_SIZE,
            offset: params.offset ?? DEFAULT_PAGE_OFFSET,
            ...(params.campaignId ? { campaignId: params.campaignId } : {}),
            ...(params.assignedToUserId
              ? { assignedToUserId: params.assignedToUserId }
              : {}),
            ...(params.currentStageId ? { currentStageId: params.currentStageId } : {}),
            ...(params.search?.trim() ? { search: params.search.trim() } : {}),
          },
        });
        return data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getCatalog() {
      try {
        const { data } = await http.get<{ data: CallerCatalog }>("/api/leads/catalog");
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getById(id) {
      try {
        const { data } = await http.get<LeadResponse>(`/api/leads/${id}`);
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async listNotes(id) {
      try {
        const { data } = await http.get<{ data: LeadNote[] }>(`/api/leads/${id}/notes`);
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async addNote(id, body) {
      try {
        const { data } = await http.post<{ data: LeadNote }>(`/api/leads/${id}/notes`, { body });
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async changeStage(id, input) {
      try {
        const { data } = await http.post<LeadResponse>(`/api/leads/${id}/stage`, input);
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
