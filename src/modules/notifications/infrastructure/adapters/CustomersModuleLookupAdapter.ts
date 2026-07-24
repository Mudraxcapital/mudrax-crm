import { getCustomer } from "@/modules/customers";
import type {
  CustomerLookupPort,
  CustomerLookupSummary,
} from "../../application/ports/CustomerLookupPort";

export class CustomersModuleLookupAdapter implements CustomerLookupPort {
  async findById(customerId: string): Promise<CustomerLookupSummary | null> {
    const customer = await getCustomer(customerId);
    if (!customer) return null;
    // Identifiers are masked by customers' public API — Null provider does
    // not need a real address; callers may still supply recipientAddress.
    const emailIdentifier = customer.identifiers.find((item) => item.type === "EMAIL");
    const phoneIdentifier = customer.identifiers.find((item) => item.type === "PHONE");
    return {
      id: customer.id,
      organizationId: customer.organizationId,
      email: emailIdentifier?.valueMasked ?? null,
      phone: phoneIdentifier?.valueMasked ?? null,
    };
  }
}
