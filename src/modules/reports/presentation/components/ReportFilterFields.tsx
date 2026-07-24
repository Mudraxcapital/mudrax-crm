const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function ReportFilterFields({
  defaults,
}: {
  defaults?: {
    dateFrom?: string | null;
    dateTo?: string | null;
    branchId?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    userId?: string | null;
  };
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dateFrom" className="text-foreground/80 text-sm font-medium">
          Date from
        </label>
        <input
          id="dateFrom"
          name="dateFrom"
          type="date"
          defaultValue={defaults?.dateFrom?.slice(0, 10) ?? ""}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dateTo" className="text-foreground/80 text-sm font-medium">
          Date to
        </label>
        <input
          id="dateTo"
          name="dateTo"
          type="date"
          defaultValue={defaults?.dateTo?.slice(0, 10) ?? ""}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="branchId" className="text-foreground/80 text-sm font-medium">
          Branch ID
        </label>
        <input
          id="branchId"
          name="branchId"
          defaultValue={defaults?.branchId ?? ""}
          placeholder="Optional UUID"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="departmentId" className="text-foreground/80 text-sm font-medium">
          Department ID
        </label>
        <input
          id="departmentId"
          name="departmentId"
          defaultValue={defaults?.departmentId ?? ""}
          placeholder="Optional UUID"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="teamId" className="text-foreground/80 text-sm font-medium">
          Team ID
        </label>
        <input
          id="teamId"
          name="teamId"
          defaultValue={defaults?.teamId ?? ""}
          placeholder="Optional UUID"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="userId" className="text-foreground/80 text-sm font-medium">
          User ID
        </label>
        <input
          id="userId"
          name="userId"
          defaultValue={defaults?.userId ?? ""}
          placeholder="Optional UUID"
          className={inputClass}
        />
      </div>
    </div>
  );
}
