import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  DocumentNotFoundError,
  getCurrentDocumentVerification,
  getDocument,
  getDocumentPreview,
  listDocumentAuditLog,
  listDocumentTypes,
  listDocumentVersions,
} from "@/modules/documents";
import { DocumentMetadataForm } from "@/modules/documents/presentation/components/DocumentMetadataForm";
import { DocumentVerificationForm } from "@/modules/documents/presentation/components/DocumentVerificationForm";
import { DocumentVersionForm } from "@/modules/documents/presentation/components/DocumentVersionForm";
import { createDocumentVersionAction } from "@/modules/documents/presentation/controllers/createDocumentVersion.action";
import { updateDocumentMetadataAction } from "@/modules/documents/presentation/controllers/updateDocumentMetadata.action";
import { updateVerificationStatusAction } from "@/modules/documents/presentation/controllers/updateVerificationStatus.action";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { authContext } = await requirePermission("document.view");
  const canUpload = hasPermission(authContext, "document.upload");
  const canVerify = hasPermission(authContext, "document.verify");

  let document;
  try {
    document = await getDocument(id);
  } catch (error) {
    if (error instanceof DocumentNotFoundError) notFound();
    throw error;
  }

  if (document.organizationId !== authContext.organizationId) {
    notFound();
  }

  const [preview, versions, verification, documentTypes, auditLog] = await Promise.all([
    getDocumentPreview(id),
    listDocumentVersions(id),
    getCurrentDocumentVerification(id),
    listDocumentTypes(authContext.organizationId),
    listDocumentAuditLog(id),
  ]);

  const boundVersionAction = createDocumentVersionAction.bind(null, id);
  const boundMetadataAction = updateDocumentMetadataAction.bind(null, id);
  const boundVerificationAction = updateVerificationStatusAction.bind(null, verification.id, id);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/documents/library" className="text-sm underline underline-offset-4">
        ← Document Library
      </Link>

      <div>
        <h1 className="text-lg font-semibold">{document.documentTypeName ?? "Document"}</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          {document.ownerType} · {document.status} · Verification{" "}
          {document.latestVerificationStatus ?? "—"}
        </p>
      </div>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Preview Metadata</h2>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-foreground/60">File name</dt>
          <dd>{preview.fileName}</dd>
          <dt className="text-foreground/60">MIME type</dt>
          <dd>{preview.mimeType}</dd>
          <dt className="text-foreground/60">Size (bytes)</dt>
          <dd>{preview.sizeBytes}</dd>
          <dt className="text-foreground/60">Checksum</dt>
          <dd className="font-mono text-xs break-all">{preview.checksum}</dd>
          <dt className="text-foreground/60">Version</dt>
          <dd>{preview.versionNumber}</dd>
        </dl>
        <div className="mt-4">
          <Link
            href={`/api/documents/${id}/download`}
            className="text-sm underline underline-offset-4"
          >
            Download current version →
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Versions</h2>
        </div>
        <ul className="flex flex-col">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
            >
              <span>
                v{version.versionNumber} · {version.status}
              </span>
              <span className="text-foreground/60">
                {new Date(version.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        {canUpload ? (
          <div className="border-t border-black/10 p-4 dark:border-white/15">
            <DocumentVersionForm action={boundVersionAction} />
          </div>
        ) : null}
      </section>

      {canUpload ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Update Metadata</h2>
          <div className="mt-4">
            <DocumentMetadataForm
              action={boundMetadataAction}
              currentDocumentTypeId={document.documentTypeId}
              documentTypes={documentTypes
                .filter((type) => type.isActive)
                .map((type) => ({
                  id: type.id,
                  label: type.categoryName ? `${type.categoryName} / ${type.name}` : type.name,
                }))}
            />
          </div>
        </section>
      ) : null}

      {canVerify ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Verification</h2>
          <p className="text-foreground/60 mt-1 text-sm">
            Current cycle: {verification.status}
            {verification.rejectionReason ? ` — ${verification.rejectionReason}` : ""}
          </p>
          <div className="mt-4">
            <DocumentVerificationForm
              action={boundVerificationAction}
              currentStatus={verification.status}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Audit Log</h2>
        </div>
        <ul className="flex flex-col">
          {auditLog.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">No audit entries.</li>
          ) : (
            auditLog.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <span>{entry.action}</span>
                <span className="text-foreground/60">{entry.occurredAt.toLocaleString()}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
