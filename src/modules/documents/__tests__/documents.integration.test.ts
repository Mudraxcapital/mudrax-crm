import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Documents module (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createCustomer: (typeof import("@/modules/customers"))["createCustomer"];
  let createDocumentCategory: (typeof import("@/modules/documents"))["createDocumentCategory"];
  let createDocumentType: (typeof import("@/modules/documents"))["createDocumentType"];
  let uploadDocument: (typeof import("@/modules/documents"))["uploadDocument"];
  let createDocumentVersion: (typeof import("@/modules/documents"))["createDocumentVersion"];
  let getDocument: (typeof import("@/modules/documents"))["getDocument"];
  let getDocumentPreview: (typeof import("@/modules/documents"))["getDocumentPreview"];
  let downloadDocument: (typeof import("@/modules/documents"))["downloadDocument"];
  let updateVerificationStatus: (typeof import("@/modules/documents"))["updateVerificationStatus"];
  let getCurrentDocumentVerification: (typeof import("@/modules/documents"))["getCurrentDocumentVerification"];
  let listDocumentVersions: (typeof import("@/modules/documents"))["listDocumentVersions"];
  let listDocumentAuditLog: (typeof import("@/modules/documents"))["listDocumentAuditLog"];
  let getDocumentsDashboard: (typeof import("@/modules/documents"))["getDocumentsDashboard"];

  let organizationId: string;
  let customerId: string;
  let userId: string;
  let categoryId: string;
  let documentTypeId: string;
  let documentId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const customersModule = await import("@/modules/customers");
    const documentsModule = await import("@/modules/documents");
    prisma = dbClient.prisma;
    createCustomer = customersModule.createCustomer;
    createDocumentCategory = documentsModule.createDocumentCategory;
    createDocumentType = documentsModule.createDocumentType;
    uploadDocument = documentsModule.uploadDocument;
    createDocumentVersion = documentsModule.createDocumentVersion;
    getDocument = documentsModule.getDocument;
    getDocumentPreview = documentsModule.getDocumentPreview;
    downloadDocument = documentsModule.downloadDocument;
    updateVerificationStatus = documentsModule.updateVerificationStatus;
    getCurrentDocumentVerification = documentsModule.getCurrentDocumentVerification;
    listDocumentVersions = documentsModule.listDocumentVersions;
    listDocumentAuditLog = documentsModule.listDocumentAuditLog;
    getDocumentsDashboard = documentsModule.getDocumentsDashboard;

    const organization = await prisma.organization.upsert({
      where: { code: "MUDRAX" },
      update: {},
      create: {
        name: "Mudrax Capitals",
        code: "MUDRAX",
        status: "ACTIVE",
        timezone: "Asia/Kolkata",
      },
    });
    organizationId = organization.id;

    const customer = await createCustomer({
      organizationId,
      input: {
        fullName: "Integration Test Documents Customer",
        identifiers: [{ type: "PHONE", value: `+9197${Date.now().toString().slice(-8)}` }],
      },
      actor: { actorType: "USER", actorId: null },
    });
    customerId = customer.id;

    const uniqueSuffix = Date.now().toString().slice(-6);
    const user = await prisma.user.create({
      data: {
        organizationId,
        employeeCode: `INTDOC${uniqueSuffix}`,
        fullName: "Integration Test Documents User",
        email: `int-test-docs-${uniqueSuffix}@example.com`,
        passwordHash: "not-a-real-hash",
        status: "ACTIVE",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (documentId) {
      const versions = await prisma.documentVersion.findMany({ where: { documentId } });
      const versionIds = versions.map((version) => version.id);
      const attachmentIds = versions.map((version) => version.attachmentId);

      await prisma.auditTrail
        .deleteMany({
          where: {
            OR: [
              { targetType: "Document", targetId: documentId },
              { targetType: "DocumentVerification", targetId: { in: versionIds } },
            ],
          },
        })
        .catch(() => undefined);

      await prisma.documentVerification
        .deleteMany({ where: { documentVersionId: { in: versionIds } } })
        .catch(() => undefined);
      await prisma.documentVersion.deleteMany({ where: { documentId } }).catch(() => undefined);
      await prisma.document.delete({ where: { id: documentId } }).catch(() => undefined);
      await prisma.attachment
        .deleteMany({ where: { id: { in: attachmentIds } } })
        .catch(() => undefined);
    }

    if (documentTypeId) {
      await prisma.auditTrail
        .deleteMany({ where: { targetType: "DocumentType", targetId: documentTypeId } })
        .catch(() => undefined);
      await prisma.documentType.delete({ where: { id: documentTypeId } }).catch(() => undefined);
    }
    if (categoryId) {
      await prisma.auditTrail
        .deleteMany({ where: { targetType: "DocumentCategory", targetId: categoryId } })
        .catch(() => undefined);
      await prisma.documentCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
  });

  it("creates catalog, uploads, versions, verifies, previews, and downloads", async () => {
    const actor = { actorType: "USER" as const, actorId: userId };
    const unique = Date.now().toString().slice(-6);

    const category = await createDocumentCategory({
      organizationId,
      input: { name: `INT Category ${unique}` },
      actor,
    });
    categoryId = category.id;

    const documentType = await createDocumentType({
      organizationId,
      input: { documentCategoryId: category.id, name: `INT Type ${unique}` },
      actor,
    });
    documentTypeId = documentType.id;

    const uploaded = await uploadDocument({
      organizationId,
      userId,
      input: {
        documentTypeId: documentType.id,
        ownerType: "CUSTOMER",
        ownerId: customerId,
        fileName: "integration.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("integration-v1").toString("base64"),
      },
      actor,
    });
    documentId = uploaded.id;

    expect(uploaded.status).toBe("ACTIVE");
    expect(uploaded.latestVerificationStatus).toBe("PENDING");

    const preview = await getDocumentPreview(documentId);
    expect(preview.fileName).toBe("integration.pdf");

    const downloaded = await downloadDocument(documentId);
    expect(downloaded.content.toString("utf8")).toBe("integration-v1");

    const revised = await createDocumentVersion({
      documentId,
      userId,
      input: {
        fileName: "integration-v2.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("integration-v2").toString("base64"),
      },
      actor,
    });
    expect(revised.currentVersionNumber).toBe(2);

    const versions = await listDocumentVersions(documentId);
    expect(versions).toHaveLength(2);
    expect(versions.find((version) => version.versionNumber === 1)?.status).toBe("SUPERSEDED");

    const verification = await getCurrentDocumentVerification(documentId);
    const verified = await updateVerificationStatus({
      id: verification.id,
      userId,
      input: { status: "VERIFIED" },
      actor,
    });
    expect(verified.status).toBe("VERIFIED");

    const document = await getDocument(documentId);
    expect(document.status).toBe("VERIFIED");

    const audit = await listDocumentAuditLog(documentId);
    expect(audit.some((entry) => entry.action === "DocumentUploaded")).toBe(true);
    expect(audit.some((entry) => entry.action === "DocumentVersionCreated")).toBe(true);

    const dashboard = await getDocumentsDashboard(organizationId);
    expect(dashboard.totalDocuments).toBeGreaterThanOrEqual(1);
  });
});
