import type {
  CallerCatalog,
  CallerDashboard,
  CallerWorkspaceLead,
  Campaign,
  CampaignListResponse,
} from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface CallerDashboardParams {
  campaignId?: string | null;
}

export interface CallerLeadParams {
  campaignId?: string | null;
}

export interface CallerCatalogParams {
  currentStageId?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CallerApi {
  getDashboard: (params?: CallerDashboardParams) => Promise<CallerDashboard>;
  listMyCampaigns: () => Promise<Campaign[]>;
  getWorkspaceLead: (id: string, params?: CallerLeadParams) => Promise<CallerWorkspaceLead>;
  getCatalog: (params?: CallerCatalogParams) => Promise<CallerCatalog>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
}

function assertJsonEnvelope(data: unknown, path: string): asserts data is { data: unknown } {
  if (typeof data === "string" && data.trimStart().startsWith("<!DOCTYPE")) {
    throw new Error(
      `${path} returned HTML instead of JSON. Restart the CRM server so /api/caller routes are available.`,
    );
  }
  if (!data || typeof data !== "object" || !("data" in data)) {
    throw new Error(`${path} returned an unexpected response.`);
  }
}

export function createCallerApi(http: AxiosInstance): CallerApi {
  return {
    async getDashboard(params = {}) {
      try {
        const { data } = await http.get<unknown>("/api/caller/dashboard", {
          params: params.campaignId ? { campaignId: params.campaignId } : undefined,
        });
        assertJsonEnvelope(data, "/api/caller/dashboard");
        return data.data as CallerDashboard;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async listMyCampaigns() {
      try {
        const { data } = await http.get<unknown>("/api/caller/campaigns");
        assertJsonEnvelope(data, "/api/caller/campaigns");
        return (data as CampaignListResponse).data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getWorkspaceLead(id, params = {}) {
      try {
        const { data } = await http.get<{ data: CallerWorkspaceLead }>(`/api/caller/leads/${id}`, {
          params: params.campaignId ? { campaignId: params.campaignId } : undefined,
        });
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getCatalog(params = {}) {
      try {
        const { data } = await http.get<{ data: CallerCatalog }>("/api/caller/catalog", {
          params: params.currentStageId
            ? { currentStageId: params.currentStageId }
            : undefined,
        });
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async changePassword(input) {
      try {
        await http.post("/api/caller/password", input);
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
