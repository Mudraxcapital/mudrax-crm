// ============================================================================
// src/modules/telephony/domain/repositories/ExtensionRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaExtensionRepository. Intentionally
// minimal — see domain/entities/Extension.ts's doc comment on scope.
// ============================================================================

import type { Extension } from "../entities/Extension";

export interface CreateExtensionData {
  organizationId: string;
  userId: string;
  extensionNumber: string;
}

export interface ExtensionRepository {
  findById(id: string): Promise<Extension | null>;
  findByUserId(userId: string): Promise<Extension | null>;
  create(data: CreateExtensionData): Promise<Extension>;
}
