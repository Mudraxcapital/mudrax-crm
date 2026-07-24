import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listDocumentCategories, listDocumentTypes } from "@/modules/documents";
import { DocumentCategoryForm } from "@/modules/documents/presentation/components/DocumentCategoryForm";
import { DocumentTypeForm } from "@/modules/documents/presentation/components/DocumentTypeForm";
import { createDocumentCategoryAction } from "@/modules/documents/presentation/controllers/createDocumentCategory.action";
import { createDocumentTypeAction } from "@/modules/documents/presentation/controllers/createDocumentType.action";
import { updateDocumentCategoryAction } from "@/modules/documents/presentation/controllers/updateDocumentCategory.action";
import { updateDocumentTypeAction } from "@/modules/documents/presentation/controllers/updateDocumentType.action";

export default async function DocumentCategoriesPage() {
  const { authContext } = await requirePermission("document.category.manage");

  const [categories, documentTypes] = await Promise.all([
    listDocumentCategories(authContext.organizationId),
    listDocumentTypes(authContext.organizationId),
  ]);

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/documents" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Documents Dashboard
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Document Categories &amp; Types</h1>
        <p className="text-muted mt-1 text-sm">
          Admin catalog used to classify every uploaded Document.
        </p>
      </div>

      <section className="mx-card p-5">
        <h2 className="text-sm font-medium">Add Category</h2>
        <div className="mt-4">
          <DocumentCategoryForm action={createDocumentCategoryAction} />
        </div>
      </section>

      <section className="mx-card overflow-hidden">
        <ul className="flex flex-col">
          {categories.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">
              No Document Categories configured yet.
            </li>
          ) : (
            categories.map((category) => {
              const boundUpdate = updateDocumentCategoryAction.bind(null, category.id);
              return (
                <li
                  key={category.id}
                  className="border-b border-border px-4 py-4 last:border-0 "
                >
                  <DocumentCategoryForm action={boundUpdate} category={category} />
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="mx-card p-5">
        <h2 className="text-sm font-medium">Add Document Type</h2>
        <div className="mt-4">
          <DocumentTypeForm action={createDocumentTypeAction} categories={categoryOptions} />
        </div>
      </section>

      <section className="mx-card overflow-hidden">
        <ul className="flex flex-col">
          {documentTypes.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">
              No Document Types configured yet.
            </li>
          ) : (
            documentTypes.map((documentType) => {
              const boundUpdate = updateDocumentTypeAction.bind(null, documentType.id);
              return (
                <li
                  key={documentType.id}
                  className="border-b border-border px-4 py-4 last:border-0 "
                >
                  <DocumentTypeForm
                    action={boundUpdate}
                    documentType={documentType}
                    categories={categoryOptions}
                  />
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
