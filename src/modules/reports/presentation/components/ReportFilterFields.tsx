const inputClass = "mx-input";

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
        <label htmlFor="dateFrom" className="mx-label">
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
        <label htmlFor="dateTo" className="mx-label">
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
        <label htmlFor="branchId" className="mx-label">
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
        <label htmlFor="departmentId" className="mx-label">
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
        <label htmlFor="teamId" className="mx-label">
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
        <label htmlFor="userId" className="mx-label">
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
