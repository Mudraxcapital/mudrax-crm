// Public API of the `caller-workspace` module.
//
// Composition module for the dedicated Caller experience. Always scopes data
// to the logged-in Caller (and optional current Campaign). Does not own
// tables — reuses leads / campaigns / telephony / follow-ups.

import { makeGetCallerDashboard } from "./application/use-cases/getCallerDashboard";
import { makeGetCallerPerformance } from "./application/use-cases/getCallerPerformance";
import { makeListCallerCallHistory } from "./application/use-cases/listCallerCallHistory";
import {
  makeGetCallerWorkspaceLead,
  CallerLeadAccessDeniedError,
} from "./application/use-cases/getCallerWorkspaceLead";

export type {
  CallerCampaignOptionDto,
  CallerLeadQueueItemDto,
  CallerProgressDto,
  CallerDashboardDto,
  CallerCallHistoryRowDto,
  CallerFollowUpRowDto,
  CallerOutcomeCountDto,
  CallerTimeMetricsDto,
  CallerPerformanceDto,
  CallerWorkspaceLeadDto,
} from "./application/dto/CallerWorkspaceDto";

export { CallerLeadAccessDeniedError };
export type { GetCallerDashboardQuery } from "./application/use-cases/getCallerDashboard";
export type { GetCallerPerformanceQuery } from "./application/use-cases/getCallerPerformance";
export type { ListCallerCallHistoryQuery } from "./application/use-cases/listCallerCallHistory";
export type { GetCallerWorkspaceLeadQuery } from "./application/use-cases/getCallerWorkspaceLead";

export const getCallerDashboard = makeGetCallerDashboard();
export const getCallerPerformance = makeGetCallerPerformance();
export const listCallerCallHistory = makeListCallerCallHistory();
export const getCallerWorkspaceLead = makeGetCallerWorkspaceLead();
