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
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/documents" className="text-sm underline underline-offset-4">
        ← Documents Dashboard
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Document Categories &amp; Types</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Admin catalog used to classify every uploaded Document.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Add Category</h2>
        <div className="mt-4">
          <DocumentCategoryForm action={createDocumentCategoryAction} />
        </div>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <ul className="flex flex-col">
          {categories.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">
              No Document Categories configured yet.
            </li>
          ) : (
            categories.map((category) => {
              const boundUpdate = updateDocumentCategoryAction.bind(null, category.id);
              return (
                <li
                  key={category.id}
                  className="border-b border-black/5 px-4 py-4 last:border-0 dark:border-white/10"
                >
                  <DocumentCategoryForm action={boundUpdate} category={category} />
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Add Document Type</h2>
        <div className="mt-4">
          <DocumentTypeForm action={createDocumentTypeAction} categories={categoryOptions} />
        </div>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <ul className="flex flex-col">
          {documentTypes.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">
              No Document Types configured yet.
            </li>
          ) : (
            documentTypes.map((documentType) => {
              const boundUpdate = updateDocumentTypeAction.bind(null, documentType.id);
              return (
                <li
                  key={documentType.id}
                  className="border-b border-black/5 px-4 py-4 last:border-0 dark:border-white/10"
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
