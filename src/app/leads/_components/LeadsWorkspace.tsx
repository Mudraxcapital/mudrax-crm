"use client";

import { useState } from "react";
import { BulkLeadActions } from "@/modules/leads/presentation/components/BulkLeadActions";
import { MergeLeadsForm } from "@/modules/leads/presentation/components/MergeLeadsForm";
import { LeadsTable, type LeadRow } from "./LeadsTable";

export function LeadsWorkspace({
  rows,
  canReassign,
  canUpdate,
  stages,
  lostReasons,
  assignees,
}: {
  rows: LeadRow[];
  canReassign: boolean;
  canUpdate: boolean;
  stages: Array<{ id: string; name: string; bucket?: string; closeOutcome?: string | null }>;
  lostReasons: Array<{ id: string; name: string }>;
  assignees: Array<{ id: string; fullName: string }>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <>
      <LeadsTable rows={rows} onSelectionChange={setSelectedIds} />

      {canReassign || canUpdate ? (
        <details className="mx-card">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium">More actions</summary>
          <div className="space-y-6 border-t border-border px-5 py-4">
            {canReassign || canUpdate ? (
              <div>
                <h3 className="text-sm font-medium">Bulk actions</h3>
                <div className="mt-3">
                  <BulkLeadActions
                    selectedLeadIds={selectedIds}
                    stages={stages}
                    lostReasons={lostReasons}
                    assignees={assignees}
                  />
                </div>
              </div>
            ) : null}
            {canUpdate ? (
              <div>
                <h3 className="text-sm font-medium">Merge leads</h3>
                <div className="mt-3">
                  <MergeLeadsForm
                    lostReasons={lostReasons}
                    leads={rows.map((row) => ({
                      id: row.id,
                      fullName: row.fullNameSnapshot,
                    }))}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </>
  );
}
