import { describe, expect, it } from "vitest";
import { FakeCustomerRepository } from "./fakeCustomerRepository";
import { makeCreateCustomer } from "../application/use-cases/createCustomer";
import { makeMergeCustomers } from "../application/use-cases/mergeCustomers";
import { makeDetectDuplicates } from "../application/use-cases/detectDuplicates";
import { createCustomerSchema } from "../application/validators/customerSchemas";

const orgId = "00000000-0000-0000-0000-000000000001";
const actor = { actorType: "USER" as const, actorId: "00000000-0000-0000-0000-000000000099" };

describe("mergeCustomers / detectDuplicates", () => {
  it("merges two customers and tombstones the merged-away record", async () => {
    const repo = new FakeCustomerRepository();
    const createCustomer = makeCreateCustomer(repo);
    const mergeCustomers = makeMergeCustomers(repo);

    const a = await createCustomer({
      organizationId: orgId,
      input: createCustomerSchema.parse({
        fullName: "Rahul Sharma",
        identifiers: [{ type: "PHONE", value: "+919876543210" }],
      }),
      actor,
    });
    const b = await createCustomer({
      organizationId: orgId,
      input: createCustomerSchema.parse({
        fullName: "Rahul S",
        identifiers: [{ type: "EMAIL", value: "rahul@example.com" }],
      }),
      actor,
    });

    const result = await mergeCustomers({
      organizationId: orgId,
      input: {
        survivingCustomerId: a.id,
        mergedAwayCustomerId: b.id,
        reason: "Same person",
      },
      actor,
    });

    expect(result.survivor.id).toBe(a.id);
    const mergedAway = await repo.findById(b.id);
    expect(mergedAway?.customer.status).toBe("MERGED");
    expect(mergedAway?.customer.mergedIntoCustomerId).toBe(a.id);
  });

  it("detects phone overlaps as duplicate candidates", async () => {
    const repo = new FakeCustomerRepository();
    const createCustomer = makeCreateCustomer(repo);
    const detectDuplicates = makeDetectDuplicates(repo);

    await createCustomer({
      organizationId: orgId,
      input: createCustomerSchema.parse({
        fullName: "A One",
        identifiers: [{ type: "PHONE", value: "+911111111111" }],
      }),
      actor,
    });
    await createCustomer({
      organizationId: orgId,
      input: createCustomerSchema.parse({
        fullName: "A Two",
        identifiers: [{ type: "PHONE", value: "+911111111111" }],
      }),
      actor,
    });

    const result = await detectDuplicates(orgId);
    expect(result.created.length).toBeGreaterThanOrEqual(1);
    expect(result.created[0]?.matchType).toBe("PROBABILISTIC_PHONE");
  });
});
