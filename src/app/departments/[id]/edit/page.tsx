import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { getDepartment, DepartmentNotFoundError } from "@/modules/organization";
import { DepartmentForm } from "@/modules/organization/presentation/components/DepartmentForm";
import { updateDepartmentAction } from "@/modules/organization/presentation/controllers/updateDepartment.action";

export default async function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("department.manage");
  const { id } = await params;

  let department;
  try {
    department = await getDepartment(id);
  } catch (error) {
    if (error instanceof DepartmentNotFoundError) {
      notFound();
    }
    throw error;
  }

  const boundAction = updateDepartmentAction.bind(null, id);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-12">
      <Link href="/departments" className="text-sm underline underline-offset-4">
        ← Back to Departments
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Edit Department</h1>
        <p className="text-foreground/60 mt-1 text-sm">{department.name}</p>
      </div>

      <DepartmentForm action={boundAction} department={department} submitLabel="Save changes" />
    </div>
  );
}
