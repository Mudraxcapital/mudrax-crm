import { findBankById } from "@/modules/banks";
import type { BankLookupPort, BankLookupSummary } from "../../application/ports/BankLookupPort";

export class BanksModuleLookupAdapter implements BankLookupPort {
  async findById(bankId: string): Promise<BankLookupSummary | null> {
    const bank = await findBankById(bankId);
    if (!bank) return null;
    return { id: bank.id, organizationId: bank.organizationId, status: bank.status };
  }
}
