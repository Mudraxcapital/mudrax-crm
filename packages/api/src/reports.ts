import type {
  ReportRunResponse,
  ReportType,
  SavedReport,
  SavedReportListResponse,
  SavedReportResponse,
} from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

const REPORT_TYPE_PATH: Record<ReportType, string> = {
  CUSTOMER: "/api/reports/customers",
  LEAD: "/api/reports/leads",
  CAMPAIGN: "/api/reports/campaigns",
  TELEPHONY: "/api/reports/telephony",
  DOCUMENT: "/api/reports/documents",
  NOTIFICATION: "/api/reports/notifications",
};

export interface ReportsApi {
  listSaved: () => Promise<SavedReport[]>;
  getSavedById: (id: string) => Promise<SavedReport>;
  runByType: (type: ReportType, params?: Record<string, unknown>) => Promise<ReportRunResponse>;
  getDashboard: () => Promise<unknown>;
  getCallerLeaderboard: () => Promise<unknown>;
}

export function createReportsApi(http: AxiosInstance): ReportsApi {
  return {
    async listSaved() {
      try {
        const { data } = await http.get<SavedReportListResponse>("/api/reports/saved");
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getSavedById(id) {
      try {
        const { data } = await http.get<SavedReportResponse>(`/api/reports/saved/${id}`);
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async runByType(type, params) {
      try {
        const { data } = await http.get<ReportRunResponse>(REPORT_TYPE_PATH[type], {
          params,
        });
        return data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getDashboard() {
      try {
        const { data } = await http.get("/api/reports/dashboard");
        return data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getCallerLeaderboard() {
      try {
        const { data } = await http.get("/api/reports/caller-leaderboard");
        return data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
