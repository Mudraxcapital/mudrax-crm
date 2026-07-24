import type { AnalyticsKpis, NamedCount } from "../ports/SourceDataPort";

export type NamedCountDto = NamedCount;

export interface AnalyticsDashboardDto extends AnalyticsKpis {
  generatedAt: string;
}

export function toAnalyticsDashboardDto(kpis: AnalyticsKpis, generatedAt = new Date()): AnalyticsDashboardDto {
  return {
    ...kpis,
    generatedAt: generatedAt.toISOString(),
  };
}
