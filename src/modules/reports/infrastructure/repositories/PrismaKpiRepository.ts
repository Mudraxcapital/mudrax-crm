import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateKpiData,
  CreateMetricDefinitionData,
  KpiRepository,
  MetricDefinitionRepository,
} from "../../domain/repositories/KpiRepository";
import type { Kpi } from "../../domain/entities/Kpi";
import type { MetricDefinition } from "../../domain/entities/MetricDefinition";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { toKpi, toMetricDefinition } from "../mappers/reportsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaMetricDefinitionRepository implements MetricDefinitionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<MetricDefinition | null> {
    const row = await this.prisma.metricDefinition.findUnique({ where: { id } });
    return row ? toMetricDefinition(row) : null;
  }

  async findByName(organizationId: string, name: string): Promise<MetricDefinition | null> {
    const row = await this.prisma.metricDefinition.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    return row ? toMetricDefinition(row) : null;
  }

  async upsertWithAudit(
    data: CreateMetricDefinitionData,
    actor: ReportsAuditActor,
  ): Promise<MetricDefinition> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.metricDefinition.upsert({
        where: {
          organizationId_name: { organizationId: data.organizationId, name: data.name },
        },
        update: {
          domain: data.domain,
          aggregationFunction: data.aggregationFunction,
          dimensions: (data.dimensions ?? {}) as Prisma.InputJsonValue,
          freshnessPolicy: data.freshnessPolicy,
          status: data.status ?? "PUBLISHED",
        },
        create: {
          organizationId: data.organizationId,
          name: data.name,
          domain: data.domain,
          aggregationFunction: data.aggregationFunction,
          dimensions: (data.dimensions ?? {}) as Prisma.InputJsonValue,
          freshnessPolicy: data.freshnessPolicy,
          status: data.status ?? "PUBLISHED",
        },
      });
      const metric = toMetricDefinition(row);
      await tx.reportAuditLog.create({
        data: {
          organizationId: metric.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "MetricDefinitionUpserted",
          targetType: "ReportTemplate",
          targetId: metric.id,
          afterState: { id: metric.id, name: metric.name, domain: metric.domain },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return metric;
    });
  }
}

export class PrismaKpiRepository implements KpiRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Kpi | null> {
    const row = await this.prisma.kpi.findUnique({ where: { id } });
    return row ? toKpi(row) : null;
  }

  async findByName(organizationId: string, name: string): Promise<Kpi | null> {
    const row = await this.prisma.kpi.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    return row ? toKpi(row) : null;
  }

  async list(organizationId: string): Promise<Kpi[]> {
    const rows = await this.prisma.kpi.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    return rows.map(toKpi);
  }

  async upsertWithAudit(data: CreateKpiData, actor: ReportsAuditActor): Promise<Kpi> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.kpi.upsert({
        where: {
          organizationId_name: { organizationId: data.organizationId, name: data.name },
        },
        update: {
          metricDefinitionId: data.metricDefinitionId,
          status: data.status ?? "ACTIVE",
        },
        create: {
          organizationId: data.organizationId,
          metricDefinitionId: data.metricDefinitionId,
          name: data.name,
          status: data.status ?? "ACTIVE",
        },
      });
      const kpi = toKpi(row);
      await tx.reportAuditLog.create({
        data: {
          organizationId: kpi.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "KpiUpserted",
          targetType: "Dashboard",
          targetId: kpi.id,
          afterState: { id: kpi.id, name: kpi.name, status: kpi.status },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return kpi;
    });
  }
}
