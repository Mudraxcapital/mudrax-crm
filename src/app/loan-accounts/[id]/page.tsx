import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getCustomer } from "@/modules/customers";
import { getLoanAccount, LoanAccountNotFoundError } from "@/modules/loan-accounts";
import { CloseAccountButton } from "@/modules/loan-accounts/presentation/components/CloseAccountButton";
import { resolveDisplayName } from "@/shared/ui/displayName";

export default async function LoanAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authContext } = await requirePermission("loan_account.view");
  const canManage = hasPermission(authContext, "loan_account.manage");

  let account;
  try {
    account = await getLoanAccount(id, authContext.organizationId);
  } catch (error) {
    if (error instanceof LoanAccountNotFoundError) notFound();
    throw error;
  }

  const customer = await getCustomer(account.customerId).catch(() => null);
  const customerName = resolveDisplayName(customer?.fullName);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/loan-accounts" className="text-sm text-accent hover:underline underline-offset-4">
        ← Accounts
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{customerName}</h1>
        <p className="text-muted mt-1 text-sm">
          Account {account.accountNumber} · Sanction {account.sanctionedAmount} ·{" "}
          {account.interestRateSnapshot}% · {account.tenureMonthsSnapshot}m
        </p>
        <p className="mt-2 text-sm">
          {account.isActive ? "Active" : "Closed"} · {account.loanStatusName}
        </p>
      </div>
      {canManage && account.isActive ? <CloseAccountButton accountId={account.id} /> : null}
    </div>
  );
}
