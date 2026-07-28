"use client";

import { useMemo, useState, useTransition } from "react";
import {
  LEAD_CENTER_IMPORT_SCOPE_LABELS,
  LEAD_CENTER_IMPORT_SCOPES,
  LEAD_CENTER_SOURCE_LABELS,
  type LeadCenterImportScope,
  type LeadCenterSourceCode,
} from "@/modules/lead-center/catalog";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import {
  importToCampaignAction,
  previewImportAction,
  type BulkActionState,
} from "../controllers/bulkAndImport.actions";

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceLabel(code: string): string {
  return LEAD_CENTER_SOURCE_LABELS[code as LeadCenterSourceCode] ?? code;
}

export interface LeadCenterCampaignOption {
  id: string;
  name: string;
  status: string;
}

/** Serializable staged-lead row for the client workspace (no Prisma types). */
export interface StagedLeadRow {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  sourceCode: string;
  campaignNameHint: string | null;
  createdAt: string;
  status: string;
  duplicateStatus: string;
  validationStatus: string;
  importStatus: string;
  tags: string[];
}

export function LeadCenterWorkspace({
  initialLeads,
  campaigns,
  canImport,
  canCreateCampaign,
  canViewIntegrations = false,
}: {
  initialLeads: StagedLeadRow[];
  campaigns: LeadCenterCampaignOption[];
  canImport: boolean;
  canCreateCampaign: boolean;
  canViewIntegrations?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [sourceScope, setSourceScope] = useState<LeadCenterImportScope>("ALL");
  const [campaignMode, setCampaignMode] = useState<"existing" | "new">("existing");
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [newCampaignName, setNewCampaignName] = useState("");
  const [allocationMethod, setAllocationMethod] = useState("EQUAL");
  const [includeExactDuplicates, setIncludeExactDuplicates] = useState(false);
  const [includeInvalid, setIncludeInvalid] = useState(false);
  const [preview, setPreview] = useState<BulkActionState["preview"]>();
  const [pending, startTransition] = useTransition();

  const visibleLeads = useMemo(() => {
    if (sourceScope === "ALL") return initialLeads;
    return initialLeads.filter((lead) => lead.sourceCode === sourceScope);
  }, [initialLeads, sourceScope]);

  function run(
    action: (prev: BulkActionState | undefined, formData: FormData) => Promise<BulkActionState>,
    extra?: Record<string, string>,
  ) {
    startTransition(async () => {
      const form = new FormData();
      form.set("sourceScope", sourceScope);
      if (extra) {
        for (const [key, value] of Object.entries(extra)) form.set(key, value);
      }
      const result = await action(undefined, form);
      setMessage(result.error ?? result.success ?? null);
      if (result.preview) setPreview(result.preview);
    });
  }

  return (
    <div className="mt-6 space-y-4">
      {canImport ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Import to campaign</h2>
          <p className="text-muted mt-1 text-xs">
            Choose Facebook, Google, WhatsApp, or all three — then preview and import into a
            campaign.
          </p>
          {message ? <p className="mt-2 text-sm">{message}</p> : null}

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="text-muted mb-1 block text-xs">Lead source</span>
              <select
                className="rounded-lg border border-border px-2 py-1 text-sm"
                value={sourceScope}
                onChange={(e) => setSourceScope(e.target.value as LeadCenterImportScope)}
              >
                {LEAD_CENTER_IMPORT_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {LEAD_CENTER_IMPORT_SCOPE_LABELS[scope]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="text-muted mb-1 block text-xs">Target</span>
              <select
                className="rounded-lg border border-border px-2 py-1 text-sm"
                value={campaignMode}
                onChange={(e) => setCampaignMode(e.target.value as "existing" | "new")}
              >
                <option value="existing">Existing campaign</option>
                {canCreateCampaign ? <option value="new">Create new campaign</option> : null}
              </select>
            </label>

            {campaignMode === "existing" ? (
              <label className="text-sm">
                <span className="text-muted mb-1 block text-xs">Campaign</span>
                <select
                  className="rounded-lg border border-border px-2 py-1 text-sm"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.status})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="text-sm">
                <span className="text-muted mb-1 block text-xs">New campaign name</span>
                <input
                  className="rounded-lg border border-border px-2 py-1 text-sm"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="Q3 Facebook Leads"
                />
              </label>
            )}

            <label className="text-sm">
              <span className="text-muted mb-1 block text-xs">Assignment</span>
              <select
                className="rounded-lg border border-border px-2 py-1 text-sm"
                value={allocationMethod}
                onChange={(e) => setAllocationMethod(e.target.value)}
              >
                <option value="NONE">None (create only)</option>
                <option value="EQUAL">Equal</option>
                <option value="ROUND_ROBIN">Round robin</option>
                <option value="RANDOM">Random</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={includeExactDuplicates}
                onChange={(e) => setIncludeExactDuplicates(e.target.checked)}
              />
              Include exact duplicates
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={includeInvalid}
                onChange={(e) => setIncludeInvalid(e.target.checked)}
              />
              Include invalid
            </label>

            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(previewImportAction, {
                  includeExactDuplicates: includeExactDuplicates ? "1" : "0",
                  includeInvalid: includeInvalid ? "1" : "0",
                })
              }
            >
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(importToCampaignAction, {
                  campaignMode,
                  campaignId,
                  newCampaignName,
                  allocationMethod,
                  includeExactDuplicates: includeExactDuplicates ? "1" : "0",
                  includeInvalid: includeInvalid ? "1" : "0",
                })
              }
            >
              {pending ? "Importing…" : "Import"}
            </Button>
          </div>

          {preview && preview.length > 0 ? (
            <div className="mt-3 max-h-48 overflow-auto rounded border border-border text-xs">
              <table className="min-w-full">
                <thead className="bg-muted/40 text-muted">
                  <tr>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Action</th>
                    <th className="px-2 py-1 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.stagedLeadId} className="border-t border-border">
                      <td className="px-2 py-1">{row.fullName}</td>
                      <td className="px-2 py-1">{row.action}</td>
                      <td className="px-2 py-1">{row.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted/40 text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 font-medium">Lead Name</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Campaign</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Duplicate</th>
              <th className="px-3 py-2 font-medium">Validation</th>
              <th className="px-3 py-2 font-medium">Import</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleLeads.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-muted px-3 py-6 text-center text-sm">
                  {canViewIntegrations
                    ? "No staged leads yet. Connect Facebook, Google, or WhatsApp from Integrations."
                    : "No staged leads yet. Ask a Manager to connect inbound sources in Integrations."}
                </td>
              </tr>
            ) : (
              visibleLeads.map((lead) => (
                <tr key={lead.id} className="align-top">
                  <td className="px-3 py-2 font-medium text-foreground">{lead.fullName}</td>
                  <td className="px-3 py-2">{lead.phone ?? "—"}</td>
                  <td className="px-3 py-2">{lead.email ?? "—"}</td>
                  <td className="px-3 py-2">{sourceLabel(lead.sourceCode)}</td>
                  <td className="px-3 py-2">{lead.campaignNameHint ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(lead.duplicateStatus)}>{lead.duplicateStatus}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(lead.validationStatus)}>{lead.validationStatus}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(lead.importStatus)}>{lead.importStatus}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
