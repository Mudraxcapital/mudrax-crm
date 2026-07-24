import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { CustomerNotFoundError, getCustomer } from "@/modules/customers";
import { EditCustomerForm } from "@/modules/customers/presentation/components/EditCustomerForm";
import { updateCustomerAction } from "@/modules/customers/presentation/controllers/updateCustomer.action";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customer.update");
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomer(id);
  } catch (error) {
    if (error instanceof CustomerNotFoundError) {
      notFound();
    }
    throw error;
  }

  const boundAction = updateCustomerAction.bind(null, id);

  return (
    <div className="mx-page flex max-w-xl flex-col gap-6">
      <Link href={`/customers/${id}`} className="text-sm text-accent hover:underline underline-offset-4">
        ← Back to Customer
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit Customer</h1>
        <p className="text-muted mt-1 text-sm">{customer.fullName}</p>
      </div>

      <EditCustomerForm action={boundAction} customer={customer} />
    </div>
  );
}
