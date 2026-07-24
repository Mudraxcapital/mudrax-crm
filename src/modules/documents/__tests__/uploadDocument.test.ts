import { describe, expect, it } from "vitest";
import { makeUploadDocument } from "../application/use-cases/uploadDocument";
import { makeCreateDocumentVersion } from "../application/use-cases/createDocumentVersion";
import { makeUpdateVerificationStatus } from "../application/use-cases/updateVerificationStatus";
import { makeGetDocumentPreview } from "../application/use-cases/getDocumentPreview";
import { makeDownloadDocument } from "../application/use-cases/downloadDocument";
import { makeGetDocumentsDashboard } from "../application/use-cases/getDocumentsDashboard";
import { makeUpdateDocumentMetadata } from "../application/use-cases/updateDocumentMetadata";
import { makeListDocumentsByCustomer } from "../application/use-cases/getDocument";
import {
  FakeAttachmentRepository,
  FakeDocumentCategoryRepository,
  FakeDocumentRepository,
  FakeDocumentTypeRepository,
  FakeDocumentVerificationRepository,
  FakeStorageLocationRepository,
} from "./fakeDocumentRepositories";
import {
  FakeCustomerLookupPort,
  FakeDocumentStoragePort,
  FakeLeadLookupPort,
} from "./fakeLookupPorts";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000002";
const CUSTOMER_ID = "00000000-0000-0000-0000-000000000003";
const ACTOR = { actorType: "USER" as const, actorId: USER_ID };

function setup() {
  const categories = new FakeDocumentCategoryRepository();
  const types = new FakeDocumentTypeRepository();
  const storageLocations = new FakeStorageLocationRepository();
  const documents = new FakeDocumentRepository();
  const attachments = new FakeAttachmentRepository();
  attachments.attachments = documents.attachments;
  const verifications = new FakeDocumentVerificationRepository();
  const storage = new FakeDocumentStoragePort();
  const customers = new FakeCustomerLookupPort();
  const leads = new FakeLeadLookupPort();
  customers.seed({ id: CUSTOMER_ID, organizationId: ORG_ID });

  const uploadDocument = makeUploadDocument(
    documents,
    types,
    categories,
    verifications,
    storageLocations,
    storage,
    customers,
    leads,
  );
  const createDocumentVersion = makeCreateDocumentVersion(
    documents,
    types,
    categories,
    verifications,
    storageLocations,
    storage,
  );
  const updateVerificationStatus = makeUpdateVerificationStatus(verifications, documents);
  const getDocumentPreview = makeGetDocumentPreview(documents, attachments);
  const downloadDocument = makeDownloadDocument(documents, attachments, storage);
  const updateDocumentMetadata = makeUpdateDocumentMetadata(
    documents,
    types,
    categories,
    verifications,
  );
  const listDocumentsByCustomer = makeListDocumentsByCustomer(
    documents,
    types,
    categories,
    verifications,
  );
  const getDocumentsDashboard = makeGetDocumentsDashboard(
    documents,
    types,
    categories,
    verifications,
  );

  return {
    categories,
    types,
    documents,
    verifications,
    storage,
    uploadDocument,
    createDocumentVersion,
    updateVerificationStatus,
    getDocumentPreview,
    downloadDocument,
    updateDocumentMetadata,
    listDocumentsByCustomer,
    getDocumentsDashboard,
  };
}

async function seedType(
  categories: FakeDocumentCategoryRepository,
  types: FakeDocumentTypeRepository,
  name = "PAN Card",
) {
  const category = await categories.createWithAudit({ organizationId: ORG_ID, name: "KYC" }, ACTOR);
  const documentType = await types.createWithAudit(
    { organizationId: ORG_ID, documentCategoryId: category.id, name },
    ACTOR,
  );
  return { category, documentType };
}

describe("Documents upload / version / verification", () => {
  it("uploads a document linked to a customer with pending verification", async () => {
    const ctx = setup();
    const { documentType } = await seedType(ctx.categories, ctx.types);

    const document = await ctx.uploadDocument({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {
        documentTypeId: documentType.id,
        ownerType: "CUSTOMER",
        ownerId: CUSTOMER_ID,
        fileName: "pan.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("hello-pan").toString("base64"),
      },
      actor: ACTOR,
    });

    expect(document.ownerType).toBe("CUSTOMER");
    expect(document.ownerId).toBe(CUSTOMER_ID);
    expect(document.status).toBe("ACTIVE");
    expect(document.currentVersionNumber).toBe(1);
    expect(document.latestVerificationStatus).toBe("PENDING");
    expect(ctx.documents.auditLog.some((entry) => entry.action === "DocumentUploaded")).toBe(true);

    const byCustomer = await ctx.listDocumentsByCustomer(CUSTOMER_ID);
    expect(byCustomer).toHaveLength(1);
    expect(byCustomer[0]!.id).toBe(document.id);
  });

  it("creates an immutable new version and opens a fresh verification", async () => {
    const ctx = setup();
    const { documentType } = await seedType(ctx.categories, ctx.types);

    const uploaded = await ctx.uploadDocument({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {
        documentTypeId: documentType.id,
        ownerType: "CUSTOMER",
        ownerId: CUSTOMER_ID,
        fileName: "pan-v1.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("version-1").toString("base64"),
      },
      actor: ACTOR,
    });

    const revised = await ctx.createDocumentVersion({
      documentId: uploaded.id,
      userId: USER_ID,
      input: {
        fileName: "pan-v2.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("version-2").toString("base64"),
      },
      actor: ACTOR,
    });

    expect(revised.currentVersionNumber).toBe(2);
    expect(revised.latestVerificationStatus).toBe("PENDING");

    const versions = [...ctx.documents.versions.values()].filter(
      (version) => version.documentId === uploaded.id,
    );
    expect(versions).toHaveLength(2);
    expect(versions.find((version) => version.versionNumber === 1)?.status).toBe("SUPERSEDED");
    expect(versions.find((version) => version.versionNumber === 2)?.status).toBe("CURRENT");
  });

  it("updates verification status and syncs document status", async () => {
    const ctx = setup();
    const { documentType } = await seedType(ctx.categories, ctx.types);

    const uploaded = await ctx.uploadDocument({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {
        documentTypeId: documentType.id,
        ownerType: "CUSTOMER",
        ownerId: CUSTOMER_ID,
        fileName: "pan.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("verify-me").toString("base64"),
      },
      actor: ACTOR,
    });

    const verification = [...ctx.verifications.verifications.values()][0]!;
    const updated = await ctx.updateVerificationStatus({
      id: verification.id,
      userId: USER_ID,
      input: { status: "VERIFIED" },
      actor: ACTOR,
    });

    expect(updated.status).toBe("VERIFIED");
    expect(ctx.documents.documents.get(uploaded.id)?.status).toBe("VERIFIED");
  });

  it("returns preview metadata and downloads stored bytes", async () => {
    const ctx = setup();
    const { documentType } = await seedType(ctx.categories, ctx.types);
    const payload = "preview-bytes";

    const uploaded = await ctx.uploadDocument({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {
        documentTypeId: documentType.id,
        ownerType: "CUSTOMER",
        ownerId: CUSTOMER_ID,
        fileName: "statement.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from(payload).toString("base64"),
      },
      actor: ACTOR,
    });

    const preview = await ctx.getDocumentPreview(uploaded.id);
    expect(preview.fileName).toBe("statement.pdf");
    expect(preview.mimeType).toBe("application/pdf");
    expect(preview.versionNumber).toBe(1);
    expect(preview.sizeBytes).toBe(Buffer.byteLength(payload));

    const downloaded = await ctx.downloadDocument(uploaded.id);
    expect(downloaded.content.toString("utf8")).toBe(payload);
    expect(downloaded.fileName).toBe("statement.pdf");
  });

  it("updates document metadata (document type)", async () => {
    const ctx = setup();
    const first = await seedType(ctx.categories, ctx.types, "PAN Card");
    const secondType = await ctx.types.createWithAudit(
      {
        organizationId: ORG_ID,
        documentCategoryId: first.category.id,
        name: "Aadhaar Card",
      },
      ACTOR,
    );

    const uploaded = await ctx.uploadDocument({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {
        documentTypeId: first.documentType.id,
        ownerType: "CUSTOMER",
        ownerId: CUSTOMER_ID,
        fileName: "id.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("id").toString("base64"),
      },
      actor: ACTOR,
    });

    const updated = await ctx.updateDocumentMetadata({
      id: uploaded.id,
      input: { documentTypeId: secondType.id },
      actor: ACTOR,
    });

    expect(updated.documentTypeId).toBe(secondType.id);
    expect(updated.documentTypeName).toBe("Aadhaar Card");
  });

  it("aggregates dashboard totals and pending verification", async () => {
    const ctx = setup();
    const { documentType, category } = await seedType(ctx.categories, ctx.types);

    ctx.documents.countByCategory = async () => [
      { documentCategoryId: category.id, categoryName: category.name, count: 1 },
    ];

    await ctx.uploadDocument({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {
        documentTypeId: documentType.id,
        ownerType: "CUSTOMER",
        ownerId: CUSTOMER_ID,
        fileName: "dash.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("dash").toString("base64"),
      },
      actor: ACTOR,
    });

    const dashboard = await ctx.getDocumentsDashboard(ORG_ID);
    expect(dashboard.totalDocuments).toBe(1);
    expect(dashboard.pendingVerification).toBe(1);
    expect(dashboard.recentlyUploaded).toHaveLength(1);
    expect(dashboard.documentsByCategory[0]?.categoryName).toBe("KYC");
  });
});
