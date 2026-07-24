import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listCustomers } from "@/modules/customers";
import { listLeads } from "@/modules/leads";
import { listDocuments, listDocumentTypes } from "@/modules/documents";
import { UploadDocumentForm } from "@/modules/documents/presentation/components/UploadDocumentForm";
import { uploadDocumentAction } from "@/modules/documents/presentation/controllers/uploadDocument.action";

export default async function DocumentsLibraryPage() {
  const { authContext } = await requirePermission("document.view");
  const canUpload = hasPermission(authContext, "document.upload");

  const [documents, documentTypes, customers, leads] = await Promise.all([
    listDocuments(authContext.organizationId),
    listDocumentTypes(authContext.organizationId),
    listCustomers(authContext.organizationId),
    listLeads(authContext.organizationId),
  ]);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/documents" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Documents Dashboard
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Document Library</h1>
        <p className="text-muted mt-1 text-sm">
          Uploaded Documents linked to Customers and Leads.
        </p>
      </div>

      <section className="mx-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Verification</th>
              <th className="px-4 py-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted px-4 py-6 text-center">
                  No Documents yet.
                </td>
              </tr>
            ) : (
              documents.map((document) => (
                <tr
                  key={document.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">{document.documentTypeName ?? "—"}</td>
                  <td className="px-4 py-3">
                    {document.ownerType} ·{" "}
                    <span className="font-mono text-xs">{document.ownerId.slice(0, 8)}…</span>
                  </td>
                  <td className="px-4 py-3">{document.status}</td>
                  <td className="px-4 py-3">{document.latestVerificationStatus ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/documents/library/${document.id}`}
                      className="text-sm text-accent hover:text-accent hover:underline underline-offset-4"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {canUpload ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Upload Document</h2>
          <div className="mt-4">
            <UploadDocumentForm
              action={uploadDocumentAction}
              documentTypes={documentTypes
                .filter((type) => type.isActive)
                .map((type) => ({
                  id: type.id,
                  label: type.categoryName ? `${type.categoryName} / ${type.name}` : type.name,
                }))}
              customers={customers.map((customer) => ({
                id: customer.id,
                label: customer.fullName,
              }))}
              leads={leads.map((lead) => ({
                id: lead.id,
                label: lead.fullNameSnapshot,
              }))}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
