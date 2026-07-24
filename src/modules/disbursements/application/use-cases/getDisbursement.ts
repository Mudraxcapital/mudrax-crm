import type { DisbursementRepository } from "../../domain/repositories/DisbursementRepository";
import { DisbursementNotFoundError } from "../../domain/errors/DisbursementErrors";
import { toCommissionDto, toDisbursementDto, type CommissionDto, type DisbursementDto } from "../dto/DisbursementDto";

export function makeGetDisbursement(repository: DisbursementRepository) {
  return async function getDisbursement(id: string, organizationId: string): Promise<DisbursementDto> {
    const d = await repository.findById(id);
    if (!d || d.organizationId !== organizationId) throw new DisbursementNotFoundError(id);
    const commission = await repository.findCommissionByDisbursementId(id);
    return toDisbursementDto(d, commission);
  };
}

export function makeListDisbursements(repository: DisbursementRepository) {
  return async function listDisbursements(
    organizationId: string,
    filter?: { status?: DisbursementDto["status"]; limit?: number; offset?: number },
  ): Promise<DisbursementDto[]> {
    const rows = await repository.list(organizationId, filter);
    const result: DisbursementDto[] = [];
    for (const row of rows) {
      const commission = await repository.findCommissionByDisbursementId(row.id);
      result.push(toDisbursementDto(row, commission));
    }
    return result;
  };
}

export function makeListCommissions(repository: DisbursementRepository) {
  return async function listCommissions(
    organizationId: string,
    filter?: { status?: CommissionDto["status"]; limit?: number },
  ): Promise<CommissionDto[]> {
    const rows = await repository.listCommissions(organizationId, filter);
    return rows.map(toCommissionDto);
  };
}
