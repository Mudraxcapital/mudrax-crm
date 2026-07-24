// Public API of the `analytics` module.
//
// Predates ADR 0009's decision that `reports` owns the entire Reports &
// Analytics bounded context. This module is a thin re-export of `reports`
// so existing import paths remain stable.
export {
  getAnalyticsDashboard,
  listDashboards,
  getDashboard,
  createDashboard,
  publishDashboard,
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  type AnalyticsDashboardDto,
  type DashboardDto,
  type ReportType,
} from "@/modules/reports";
