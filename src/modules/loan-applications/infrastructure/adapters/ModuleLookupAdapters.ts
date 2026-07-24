import { getCustomer, CustomerNotFoundError } from "@/modules/customers";
import { getLead, LeadNotFoundError } from "@/modules/leads";
import { findLoanProductById } from "@/modules/loan-products";
import { listBanks } from "@/modules/banks";
import { prisma } from "@/infra/db/client";
import type {
  CustomerLookupPort,
  DashboardMetricsPort,
  LeadLookupPort,
  LoanProductLookupPort,
} from "../../application/ports/LookupPorts";

export class CustomersModuleLookupAdapter implements CustomerLookupPort {
  async findById(id: string) {
    try {
      const customer = await getCustomer(id);
      return { id: customer.id, organizationId: customer.organizationId };
    } catch (error) {
      if (error instanceof CustomerNotFoundError) return null;
      throw error;
    }
  }
}

export class LeadsModuleLookupAdapter implements LeadLookupPort {
  async findById(id: string) {
    try {
      const lead = await getLead(id);
      return { id: lead.id, organizationId: lead.organizationId };
    } catch (error) {
      if (error instanceof LeadNotFoundError) return null;
      throw error;
    }
  }
}

export class LoanProductsModuleLookupAdapter implements LoanProductLookupPort {
  async findById(id: string) {
    const product = await findLoanProductById(id);
    if (!product) return null;
    return {
      id: product.id,
      organizationId: product.organizationId,
      status: product.status,
      bankId: product.bankId,
    };
  }
}

export class PrismaDashboardMetricsAdapter implements DashboardMetricsPort {
  async getDisbursementTotals(organizationId: string) {
    const disbursed = await prisma.disbursement.aggregate({
      where: {
        organizationId,
        status: { in: ["DISBURSED", "RECONCILED"] },
      },
      _sum: { amount: true },
    });
    const commissions = await prisma.commission.findMany({
      where: { disbursement: { organizationId } },
      select: { status: true, computedAmount: true },
    });
    let pending = 0;
    let received = 0;
    for (const c of commissions) {
      const amount = Number(c.computedAmount);
      if (c.status === "ACCRUED" || c.status === "INVOICED") pending += amount;
      if (c.status === "RECEIVED" || c.status === "RECONCILED") received += amount;
    }
    return {
      totalDisbursed: (disbursed._sum.amount ?? 0).toString(),
      commissionPending: pending.toFixed(2),
      commissionReceived: received.toFixed(2),
    };
  }

  async getTopBanks(organizationId: string) {
    const apps = await prisma.loanApplication.findMany({
      where: { organizationId },
      select: { loanProductId: true },
    });
    const productIds = [...new Set(apps.map((a) => a.loanProductId))];
    if (productIds.length === 0) return [];
    const products = await prisma.loanProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, bankId: true },
    });
    const productBank = new Map(products.map((p) => [p.id, p.bankId]));
    const counts = new Map<string, number>();
    for (const app of apps) {
      const bankId = productBank.get(app.loanProductId);
      if (!bankId) continue;
      counts.set(bankId, (counts.get(bankId) ?? 0) + 1);
    }
    const banks = await listBanks(organizationId);
    const nameById = new Map(banks.map((b) => [b.id, b.name]));
    return [...counts.entries()]
      .map(([bankId, applicationCount]) => ({
        bankId,
        bankName: nameById.get(bankId) ?? bankId,
        applicationCount,
      }))
      .sort((a, b) => b.applicationCount - a.applicationCount)
      .slice(0, 5);
  }
}
