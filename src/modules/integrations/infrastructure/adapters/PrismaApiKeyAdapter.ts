// ============================================================================
// src/modules/integrations/infrastructure/adapters/PrismaApiKeyAdapter.ts
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import type { ApiKeyPort, IntegrationApiKeyView } from "../../application/ports/ApiKeyPort";
import { generateToken, hashSecret, secretPrefix, verifySecret } from "../../application/services/secrets";

function toView(row: {
  id: string;
  name: string;
  keyPrefix: string;
  integrationRef: string | null;
  dataScope: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  ownerUserId: string;
}): IntegrationApiKeyView {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    integrationRef: row.integrationRef,
    dataScope: row.dataScope,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    ownerUserId: row.ownerUserId,
  };
}

export class PrismaApiKeyAdapter implements ApiKeyPort {
  constructor(private readonly prisma: PrismaClient) {}

  async listForOrganizationOwner(ownerUserId: string): Promise<IntegrationApiKeyView[]> {
    const rows = await this.prisma.apiKey.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toView);
  }

  async create(input: {
    ownerUserId: string;
    name: string;
    integrationRef?: string | null;
    dataScope?: "ORGANIZATION" | "BRANCH" | "TEAM" | "SELF";
    expiresAt?: Date | null;
  }) {
    const plaintextKey = `mxk_${generateToken(32)}`;
    const row = await this.prisma.apiKey.create({
      data: {
        ownerUserId: input.ownerUserId,
        name: input.name.trim(),
        keyHash: hashSecret(plaintextKey),
        keyPrefix: secretPrefix(plaintextKey),
        integrationRef: input.integrationRef ?? "rest_api",
        dataScope: input.dataScope ?? "ORGANIZATION",
        expiresAt: input.expiresAt ?? null,
      },
    });
    return { view: toView(row), plaintextKey };
  }

  async revoke(id: string, ownerUserId: string) {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, ownerUserId, revokedAt: null },
    });
    if (!existing) return null;
    const row = await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return toView(row);
  }

  async findActiveByPlaintext(plaintextKey: string) {
    const prefix = secretPrefix(plaintextKey);
    const candidates = await this.prisma.apiKey.findMany({
      where: {
        keyPrefix: prefix,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      take: 20,
    });
    for (const candidate of candidates) {
      if (verifySecret(plaintextKey, candidate.keyHash)) {
        return {
          id: candidate.id,
          ownerUserId: candidate.ownerUserId,
          integrationRef: candidate.integrationRef,
          dataScope: candidate.dataScope,
        };
      }
    }
    return null;
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
