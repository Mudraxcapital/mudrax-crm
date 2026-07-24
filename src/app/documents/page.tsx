import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getDocumentsDashboard } from "@/modules/documents";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { BarList } from "@/shared/ui/Charts";
import { Button } from "@/shared/ui/Button";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { TabNav } from "@/shared/ui/Tabs";
import { EmptyState } from "@/shared/ui/EmptyState";

export default async function DocumentsDashboardPage() {
  const { authContext } = await requirePermission("documents.dashboard.view");
  const canManageCategories = hasPermission(authContext, "document.category.manage");
  const dashboard = await getDocumentsDashboard(authContext.organizationId);

  return (
    <PageSection>
      <PageHeader
        title="Documents"
        description="Uploaded files, categories, and pending verification."
        actions={
          <>
            {canManageCategories ? (
              <Link href="/documents/categories">
                <Button variant="secondary">Categories</Button>
              </Link>
            ) : null}
            <Link href="/documents/library">
              <Button>Library</Button>
            </Link>
          </>
        }
      />

      <TabNav
        activeHref="/documents"
        items={[
          { href: "/documents", label: "Overview" },
          { href: "/documents/library", label: "Library" },
          { href: "/documents/categories", label: "Categories" },
        ]}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total documents" value={dashboard.totalDocuments} />
        <StatCard label="Pending verification" value={dashboard.pendingVerification} />
        <StatCard label="Categories with docs" value={dashboard.documentsByCategory.length} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="By category" />
          <CardBody>
            <BarList
              data={dashboard.documentsByCategory.map((entry) => ({
                key: entry.categoryId,
                label: entry.categoryName,
                value: entry.count,
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recently uploaded"
            actions={
              <Link href="/documents/library">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          <CardBody className="p-0">
            {dashboard.recentlyUploaded.length === 0 ? (
              <EmptyState title="No documents yet" description="Uploads will appear here." />
            ) : (
              <ul className="divide-y divide-border">
                {dashboard.recentlyUploaded.map((document) => (
                  <li key={document.id}>
                    <Link
                      href={`/documents/library/${document.id}`}
                      className="hover:bg-accent-muted/30 flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors"
                    >
                      <span className="font-medium">
                        {document.documentTypeName ?? "Document"}
                      </span>
                      <Badge tone={statusTone(document.status)}>{document.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </PageSection>
  );
}
