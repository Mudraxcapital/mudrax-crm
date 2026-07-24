// ============================================================================
// prisma/seed/steps/09-customers.ts
//
// Seeds realistic demo data (requirement #5) for `customers`: eight
// Customer identities, each anchored on PAN (deterministic strong
// identifier) plus Phone/Email (probabilistic, non-unique identifiers) per
// customers.md's identity model.
//
// Customer/CustomerIdentifier have no natural business unique key to
// `upsert` on, so ids are derived with `seedId()` (see lib/determinism.ts)
// to stay idempotent across re-runs.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { IdentifierStatus, IdentifierType, IdentityConfidence } from "@prisma/client";
import { seedId } from "../lib/determinism";
import { hashIdentifierValue, maskPan, maskPhone } from "../lib/security";
import { explain, section, summary } from "../lib/logger";

interface CustomerSeed {
  key: string;
  fullName: string;
  dob: string;
  pan: string;
  phone: string;
  email: string;
}

const CUSTOMERS: CustomerSeed[] = [
  {
    key: "rahul-sharma",
    fullName: "Rahul Sharma",
    dob: "1988-04-12",
    pan: "ABCPS1234D",
    phone: "+919876543210",
    email: "rahul.sharma@example.com",
  },
  {
    key: "priya-patel",
    fullName: "Priya Patel",
    dob: "1992-09-23",
    pan: "BXZPP5678K",
    phone: "+919876543211",
    email: "priya.patel@example.com",
  },
  {
    key: "amit-verma",
    fullName: "Amit Verma",
    dob: "1985-01-30",
    pan: "CQWPV4321L",
    phone: "+919876543212",
    email: "amit.verma@example.com",
  },
  {
    key: "sneha-reddy",
    fullName: "Sneha Reddy",
    dob: "1995-11-05",
    pan: "DRTPR8765M",
    phone: "+919876543213",
    email: "sneha.reddy@example.com",
  },
  {
    key: "vikram-singh",
    fullName: "Vikram Singh",
    dob: "1980-06-18",
    pan: "EFYPS3456N",
    phone: "+919876543214",
    email: "vikram.singh@example.com",
  },
  {
    key: "anjali-nair",
    fullName: "Anjali Nair",
    dob: "1990-03-27",
    pan: "FGHPN2345P",
    phone: "+919876543215",
    email: "anjali.nair@example.com",
  },
  {
    key: "rajesh-kumar",
    fullName: "Rajesh Kumar",
    dob: "1983-12-14",
    pan: "GHIPK9876Q",
    phone: "+919876543216",
    email: "rajesh.kumar@example.com",
  },
  {
    key: "neha-gupta",
    fullName: "Neha Gupta",
    dob: "1997-07-08",
    pan: "HIJPG6543R",
    phone: "+919876543217",
    email: "neha.gupta@example.com",
  },
];

export interface CustomerSeedResult {
  customerIds: Record<string, string>;
}

export async function seedCustomers(
  prisma: PrismaClient,
  organizationId: string,
): Promise<CustomerSeedResult> {
  section("9. Customers (demo identities)");

  explain(
    "Eight Customer identities, each with a VERIFIED PAN identifier (the strong, cross-Customer-unique anchor) plus non-unique Phone/Email identifiers. Raw PAN/phone/email values are never persisted here — only the deterministic lookup hash (PAN) and masked display values, matching platform-contracts.md §3's 'irreversible lookup hash' + 'masked by default' requirements.",
  );

  const customerIds: Record<string, string> = {};

  for (const customer of CUSTOMERS) {
    const customerId = seedId(`customer:${customer.key}`);
    await prisma.customer.upsert({
      where: { id: customerId },
      update: { fullName: customer.fullName, identityConfidence: IdentityConfidence.VERIFIED },
      create: {
        id: customerId,
        organizationId,
        fullName: customer.fullName,
        dob: new Date(`${customer.dob}T00:00:00.000Z`),
        identityConfidence: IdentityConfidence.VERIFIED,
      },
    });
    customerIds[customer.key] = customerId;

    const panId = seedId(`customer-identifier:${customer.key}:pan`);
    await prisma.customerIdentifier.upsert({
      where: { id: panId },
      update: {},
      create: {
        id: panId,
        customerId,
        type: IdentifierType.PAN,
        valueHash: hashIdentifierValue(customer.pan),
        valueMasked: maskPan(customer.pan),
        status: IdentifierStatus.ACTIVE,
        verifiedAt: new Date(),
        verificationSource: "Seed data (dev-only)",
      },
    });

    const phoneId = seedId(`customer-identifier:${customer.key}:phone`);
    await prisma.customerIdentifier.upsert({
      where: { id: phoneId },
      update: {},
      create: {
        id: phoneId,
        customerId,
        type: IdentifierType.PHONE,
        valueNormalized: customer.phone,
        valueMasked: maskPhone(customer.phone),
        status: IdentifierStatus.ACTIVE,
      },
    });

    const emailId = seedId(`customer-identifier:${customer.key}:email`);
    await prisma.customerIdentifier.upsert({
      where: { id: emailId },
      update: {},
      create: {
        id: emailId,
        customerId,
        type: IdentifierType.EMAIL,
        valueNormalized: customer.email.toLowerCase(),
        valueMasked: customer.email.replace(/^(.{2}).*(@.*)$/, "$1***$2"),
        status: IdentifierStatus.ACTIVE,
      },
    });
  }

  summary("Customers", CUSTOMERS.length);
  summary("Customer Identifiers", CUSTOMERS.length * 3);

  return { customerIds };
}
