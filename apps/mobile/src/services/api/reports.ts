import type { ReportType } from "@mudrax/types";
import { getApi } from "./client";

export const reportsApi = {
  listSaved: () => getApi().reports.listSaved(),
  getSavedById: (id: string) => getApi().reports.getSavedById(id),
  runByType: (type: ReportType, params?: Record<string, unknown>) =>
    getApi().reports.runByType(type, params),
  getDashboard: () => getApi().reports.getDashboard(),
  getCallerLeaderboard: () => getApi().reports.getCallerLeaderboard(),
};
