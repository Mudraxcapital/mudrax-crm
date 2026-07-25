"use client";

import { useMemo, useState, useTransition } from "react";
import {
  LEAD_IMPORT_OPERATIONAL_FIELDS,
  LEAD_IMPORT_OPERATIONAL_LABELS,
  listSpreadsheetSheets,
  parseSpreadsheet,
  suggestColumnMapping,
  unusedHeaders,
} from "@/shared/spreadsheet/parseSpreadsheet";
import { previewLeadDistribution } from "@/modules/leads/application/use-cases/previewLeadDistribution";
import type { DuplicateDetectionSummary } from "@/modules/leads/application/use-cases/detectImportDuplicates";
import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";
import {
  createCampaignForImportAction,
  importLeadsFileAction,
  previewImportDuplicatesAction,
  type ProductivityFormState,
} from "../controllers/productivity.actions";
import {
  deleteMappingTemplate,
  loadMappingTemplates,
  saveMappingTemplate,
  type MappingTemplate,
} from "./mappingTemplates";

type Step =
  | "upload"
  | "mapping"
  | "duplicates"
  | "campaign"
  | "agents"
  | "distribution"
  | "summary";

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "upload", label: "1. Upload" },
  { id: "mapping", label: "2. Mapping" },
  { id: "duplicates", label: "3. Duplicates" },
  { id: "campaign", label: "4. Campaign" },
  { id: "agents", label: "5. Agents" },
  { id: "distribution", label: "6. Distribution" },
  { id: "summary", label: "7. Summary" },
];

export interface ImportAgentOption {
  id: string;
  fullName: string;
  openLeads: number;
  completedLeads: number;
  availability: "AVAILABLE" | "BUSY" | "OFFLINE";
}

export interface ImportCampaignOption {
  id: string;
  name: string;
  status: string;
  leadCount: number;
  agentCount: number;
  agentNames: string[];
}

export function LeadImportForm({
  sources,
  campaigns,
  agents,
  canCreateCampaign,
  importableFields = [],
}: {
  sources: Array<{ id: string; name: string }>;
  campaigns: ImportCampaignOption[];
  agents: ImportAgentOption[];
  canCreateCampaign: boolean;
  /** Active importable fields from Field Settings (auto-includes new fields). */
  importableFields?: LeadFieldDefinitionDto[];
}) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("leads.csv");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState<string>("");
  const [binaryBuffer, setBinaryBuffer] = useState<ArrayBuffer | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [leadSourceId, setLeadSourceId] = useState(sources[0]?.id ?? "");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<string, string>>>({});
  const importFieldOptions = useMemo(
    () =>
      importableFields.map((field) => ({
        key: field.internalKey,
        label: field.name,
        required: field.isRequired || field.internalKey === "full_name",
      })),
    [importableFields],
  );
  const mappingTargets = useMemo(() => {
    const fieldTargets = importFieldOptions.map((field) => ({
      key: field.key,
      label: field.label,
      required: Boolean(field.required),
    }));
    const operational = LEAD_IMPORT_OPERATIONAL_FIELDS.map((key) => ({
      key,
      label: LEAD_IMPORT_OPERATIONAL_LABELS[key],
      required: false,
    }));
    // Ensure system name/phone/email exist even before seed hydration.
    const ensured = new Map(fieldTargets.map((item) => [item.key, item]));
    if (!ensured.has("full_name")) {
      ensured.set("full_name", { key: "full_name", label: "Lead Name", required: true });
    }
    if (!ensured.has("phone")) {
      ensured.set("phone", { key: "phone", label: "Phone", required: false });
    }
    if (!ensured.has("email")) {
      ensured.set("email", { key: "email", label: "Email", required: false });
    }
    return [...ensured.values(), ...operational];
  }, [importFieldOptions]);
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [matchMode, setMatchMode] = useState<"phone" | "email" | "phone_name" | "phone_or_email">(
    "phone_or_email",
  );
  const [duplicateResolution, setDuplicateResolution] = useState<
    "import_all" | "skip_duplicates" | "merge" | "update_existing"
  >("skip_duplicates");
  const [duplicateSummary, setDuplicateSummary] = useState<DuplicateDetectionSummary | null>(null);
  const [reportCsv, setReportCsv] = useState<string | null>(null);
  const [campaignMode, setCampaignMode] = useState<"existing" | "new">("existing");
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    source: sources[0]?.name ?? "",
    description: "",
    priority: "MEDIUM",
  });
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [distributionStrategy, setDistributionStrategy] = useState<
    "ROUND_ROBIN" | "EQUAL" | "RANDOM" | "MANUAL"
  >("ROUND_ROBIN");
  const [manualAssigneeUserId, setManualAssigneeUserId] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProductivityFormState | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewRows = useMemo(() => rows.slice(0, 8), [rows]);
  const ignoredHeaders = useMemo(() => unusedHeaders(headers, mapping), [headers, mapping]);
  const nameMapped = Boolean(mapping.full_name || mapping.name);
  const requiredMapped = nameMapped;

  const mappingStatus = useMemo(() => {
    const required = ["full_name"];
    const recommended = ["phone", "email"];
    return {
      mapped: mappingTargets.filter((field) => mapping[field.key]).map((field) => field.key),
      needs: [...required, ...recommended].filter((field) => {
        if (field === "full_name") return !nameMapped;
        return !mapping[field];
      }),
    };
  }, [mapping, mappingTargets, nameMapped]);

  function buildColumnMapping(): Record<string, string | undefined> {
    const next: Record<string, string | undefined> = { ...mapping };
    if (!next.full_name && next.name) next.full_name = next.name;
    return next;
  }

  const importableCount = useMemo(() => {
    if (!duplicateSummary) return rows.length;
    if (duplicateResolution === "import_all") {
      return (
        duplicateSummary.newLeads.length +
        duplicateSummary.possibleDuplicates.length +
        duplicateSummary.exactDuplicates.length
      );
    }
    if (duplicateResolution === "skip_duplicates") {
      return duplicateSummary.newLeads.length;
    }
    return (
      duplicateSummary.newLeads.length +
      duplicateSummary.possibleDuplicates.length +
      duplicateSummary.exactDuplicates.length
    );
  }, [duplicateResolution, duplicateSummary, rows.length]);

  const filteredCampaigns = useMemo(() => {
    const q = campaignSearch.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((campaign) => campaign.name.toLowerCase().includes(q));
  }, [campaignSearch, campaigns]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId);

  const activeAgents = agents.filter((agent) => agent.availability !== "OFFLINE");
  const selectedAgents = activeAgents.filter((agent) => selectedAgentIds.includes(agent.id));

  const distributionPreview = useMemo(() => {
    if (selectedAgents.length === 0) return null;
    return previewLeadDistribution({
      leadCount: Math.max(importableCount, 0),
      strategy: distributionStrategy,
      agents: selectedAgents.map((agent) => ({
        userId: agent.id,
        fullName: agent.fullName,
        openLeads: agent.openLeads,
        completedLeads: agent.completedLeads,
        availability: agent.availability,
      })),
      manualAssigneeUserId: manualAssigneeUserId || selectedAgents[0]?.id,
    });
  }, [
    distributionStrategy,
    importableCount,
    manualAssigneeUserId,
    selectedAgents,
  ]);

  function applyParsedTable(table: {
    headers: string[];
    rows: Record<string, string>[];
    sheetName?: string;
    sheetNames?: string[];
  }) {
    if (table.headers.length === 0 || table.rows.length === 0) {
      setParseError("No data rows found in the selected sheet.");
      return;
    }
    setHeaders(table.headers);
    setRows(table.rows);
    setMapping(suggestColumnMapping(table.headers, importFieldOptions));
    setSheetNames(table.sheetNames ?? []);
    setSheetName(table.sheetName ?? "");
    setTemplates(loadMappingTemplates());
    setStep("mapping");
    setProgress(14);
  }

  async function onFileSelected(file: File | null) {
    setParseError(null);
    setResult(null);
    setDuplicateSummary(null);
    if (!file) return;
    setFileName(file.name);
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".csv")) {
        const text = await file.text();
        setCsvText(text);
        setBinaryBuffer(null);
        const table = parseSpreadsheet({ fileName: file.name, mimeType: file.type, csvText: text });
        applyParsedTable(table);
      } else {
        const binary = await file.arrayBuffer();
        setBinaryBuffer(binary);
        setCsvText(null);
        const sheets = listSpreadsheetSheets({
          fileName: file.name,
          mimeType: file.type,
          binary,
        });
        setSheetNames(sheets);
        const first = sheets[0] ?? "";
        setSheetName(first);
        const table = parseSpreadsheet({
          fileName: file.name,
          mimeType: file.type,
          binary,
          sheetName: first,
        });
        applyParsedTable(table);
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse file.");
    }
  }

  function onSheetChange(nextSheet: string) {
    if (!binaryBuffer) return;
    setSheetName(nextSheet);
    try {
      const table = parseSpreadsheet({
        fileName,
        binary: binaryBuffer,
        sheetName: nextSheet,
      });
      applyParsedTable(table);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse sheet.");
    }
  }

  function runDuplicateCheck() {
    if (!nameMapped) {
      setParseError("Map Lead Name before continuing.");
      return;
    }
    setParseError(null);
    startTransition(async () => {
      const columnMapping = buildColumnMapping();
      const response = await previewImportDuplicatesAction({
        rows,
        columnMapping: {
          ...columnMapping,
          name: columnMapping.full_name ?? columnMapping.name!,
        },
        matchMode,
      });
      if (response.error) {
        setParseError(response.error);
        return;
      }
      setDuplicateSummary(response.summary ?? null);
      setReportCsv(response.reportCsv ?? null);
      setStep("duplicates");
      setProgress(28);
    });
  }

  function downloadReport() {
    if (!reportCsv) return;
    const blob = new Blob([reportCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileName.replace(/\.[^.]+$/, "")}-duplicates.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function toggleAgent(id: string) {
    setSelectedAgentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function runImport() {
    if (!nameMapped) {
      setParseError("Name column mapping is required.");
      return;
    }
    setParseError(null);
    setProgress(85);
    startTransition(async () => {
      let resolvedCampaignId = campaignMode === "existing" ? campaignId || undefined : undefined;

      if (campaignMode === "new") {
        if (!canCreateCampaign) {
          setParseError("You do not have permission to create campaigns.");
          return;
        }
        const created = await createCampaignForImportAction({
          name: newCampaign.name,
          description: newCampaign.description,
          sourceLabel: newCampaign.source,
          priority: newCampaign.priority,
          memberUserIds: selectedAgentIds,
          distributionStrategy,
        });
        if (created.error || !created.campaignId) {
          setParseError(created.error ?? "Failed to create campaign.");
          return;
        }
        resolvedCampaignId = created.campaignId;
      }

      const columnMapping = buildColumnMapping();
      const state = await importLeadsFileAction({
        leadSourceId,
        campaignId: resolvedCampaignId,
        sourceFileName: fileName,
        sheetName: sheetName || undefined,
        rows,
        columnMapping: {
          ...columnMapping,
          name: columnMapping.full_name ?? columnMapping.name!,
        },
        skipDuplicates: duplicateResolution === "skip_duplicates",
        duplicateMatchMode: matchMode,
        duplicateResolution,
        agentUserIds: selectedAgentIds,
        distributionStrategy,
        manualAssigneeUserId:
          distributionStrategy === "MANUAL"
            ? manualAssigneeUserId || selectedAgentIds[0]
            : undefined,
      });
      setResult(state);
      setProgress(100);
      setStep("summary");
    });
  }

  function resetWizard() {
    setStep("upload");
    setProgress(0);
    setRows([]);
    setHeaders([]);
    setMapping({});
    setResult(null);
    setDuplicateSummary(null);
    setSelectedAgentIds([]);
    setBinaryBuffer(null);
    setCsvText(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((item) => (
          <li
            key={item.id}
            className={
              step === item.id
                ? "rounded-md bg-accent-muted px-2.5 py-1 font-medium text-accent"
                : "rounded-md bg-surface-sunken px-2.5 py-1 text-muted"
            }
          >
            {item.label}
          </li>
        ))}
      </ol>

      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {step === "upload" ? (
        <div className="flex flex-col gap-4">
          <label className="text-sm">
            Default Lead Source
            <select
              value={leadSourceId}
              onChange={(event) => setLeadSourceId(event.target.value)}
              required
              className="mx-input mt-1 w-full"
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            File (.csv, .xlsx, .xls)
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mx-input mt-1 w-full"
              onChange={(event) => void onFileSelected(event.target.files?.[0] ?? null)}
            />
          </label>
          {sheetNames.length > 1 ? (
            <label className="text-sm">
              Sheet
              <select
                value={sheetName}
                onChange={(event) => onSheetChange(event.target.value)}
                className="mx-input mt-1 w-full"
              >
                {sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {rows.length > 0 ? (
            <div className="rounded-lg border border-border bg-surface-sunken/40 p-3 text-sm">
              <p>
                <span className="font-medium">{rows.length}</span> rows ·{" "}
                <span className="font-medium">{headers.length}</span> headers
                {sheetName ? ` · sheet “${sheetName}”` : ""}
              </p>
              <p className="text-muted mt-1 text-xs">{headers.join(" · ")}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "mapping" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-success">✓ {mappingStatus.mapped.length} mapped</span>
            <span className="text-warning">
              ⚠ {mappingStatus.needs.length} needs mapping (name required; phone or email
              recommended)
            </span>
            <span className="text-muted">{ignoredHeaders.length} unused columns ignored</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {mappingTargets.map((field) => (
              <label key={field.key} className="text-sm">
                <span className="flex items-center justify-between gap-2">
                  <span>
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  <span className="text-xs">
                    {mapping[field.key] || (field.key === "full_name" && mapping.name) ? (
                      <span className="text-success">✓ mapped</span>
                    ) : field.key === "full_name" ||
                      field.key === "phone" ||
                      field.key === "email" ? (
                      <span className="text-warning">⚠ needs mapping</span>
                    ) : (
                      <span className="text-muted">optional</span>
                    )}
                  </span>
                </span>
                <select
                  value={mapping[field.key] ?? (field.key === "full_name" ? mapping.name : "") ?? ""}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [field.key]: event.target.value || undefined,
                    }))
                  }
                  className="mx-input mt-1 w-full"
                  required={field.required}
                >
                  <option value="">— Not mapped —</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">Mapping templates</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Template name"
                className="mx-input max-w-xs flex-1"
              />
              <button
                type="button"
                className="mx-btn mx-btn-secondary"
                onClick={() => {
                  saveMappingTemplate(templateName, mapping);
                  setTemplates(loadMappingTemplates());
                  setTemplateName("");
                }}
                disabled={!requiredMapped}
              >
                Save template
              </button>
            </div>
            {templates.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                {templates.map((template) => (
                  <li key={template.id} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={() => setMapping(template.mapping)}
                    >
                      {template.name}
                    </button>
                    <button
                      type="button"
                      className="text-muted text-xs hover:underline"
                      onClick={() => {
                        deleteMappingTemplate(template.id);
                        setTemplates(loadMappingTemplates());
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mt-2 text-xs">No saved templates yet.</p>
            )}
          </div>

          <div className="mx-scroll overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-surface-sunken">
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="px-3 py-2 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index} className="border-t border-border">
                    {headers.map((header) => (
                      <td key={header} className="px-3 py-2">
                        {row[header] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="mx-btn mx-btn-secondary"
              onClick={() => {
                setStep("upload");
                setProgress(0);
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="mx-btn mx-btn-primary"
              onClick={runDuplicateCheck}
              disabled={!requiredMapped || pending}
            >
              {pending ? "Checking…" : "Continue to duplicates"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "duplicates" && duplicateSummary ? (
        <div className="flex flex-col gap-4">
          <label className="text-sm">
            Match on
            <select
              value={matchMode}
              onChange={(event) =>
                setMatchMode(event.target.value as typeof matchMode)
              }
              className="mx-input mt-1 w-full"
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="phone_name">Phone + Name</option>
              <option value="phone_or_email">Phone or Email</option>
            </select>
          </label>
          <button
            type="button"
            className="mx-btn mx-btn-secondary self-start"
            onClick={runDuplicateCheck}
            disabled={pending}
          >
            Re-check duplicates
          </button>

          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <dt className="text-muted">New Leads</dt>
              <dd className="text-lg font-semibold text-success">
                {duplicateSummary.newLeads.length}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-muted">Possible Duplicates</dt>
              <dd className="text-lg font-semibold text-warning">
                {duplicateSummary.possibleDuplicates.length}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-muted">Exact Duplicates</dt>
              <dd className="text-lg font-semibold text-danger">
                {duplicateSummary.exactDuplicates.length}
              </dd>
            </div>
          </dl>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="font-medium">Duplicate handling</legend>
            {(
              [
                ["import_all", "Import All"],
                ["skip_duplicates", "Skip Duplicates"],
                ["merge", "Merge"],
                ["update_existing", "Update Existing"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="duplicateResolution"
                  checked={duplicateResolution === value}
                  onChange={() => setDuplicateResolution(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <button type="button" className="mx-btn mx-btn-secondary self-start" onClick={downloadReport}>
            Download duplicate report
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="mx-btn mx-btn-secondary"
              onClick={() => {
                setStep("mapping");
                setProgress(14);
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="mx-btn mx-btn-primary"
              onClick={() => {
                setStep("campaign");
                setProgress(42);
              }}
            >
              Continue to campaign
            </button>
          </div>
        </div>
      ) : null}

      {step === "campaign" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium">Where should these imported leads go?</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={campaignMode === "existing"}
                onChange={() => setCampaignMode("existing")}
              />
              Existing Campaign
            </label>
            {canCreateCampaign ? (
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={campaignMode === "new"}
                  onChange={() => setCampaignMode("new")}
                />
                Create New Campaign
              </label>
            ) : null}
          </div>

          {campaignMode === "existing" ? (
            <div className="flex flex-col gap-3">
              <input
                value={campaignSearch}
                onChange={(event) => setCampaignSearch(event.target.value)}
                placeholder="Search campaigns…"
                className="mx-input"
              />
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {filteredCampaigns.map((campaign) => (
                  <label
                    key={campaign.id}
                    className={`block cursor-pointer rounded-lg border p-3 text-sm ${
                      campaignId === campaign.id
                        ? "border-accent bg-accent-muted/40"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      className="mr-2"
                      checked={campaignId === campaign.id}
                      onChange={() => setCampaignId(campaign.id)}
                    />
                    <span className="font-medium">{campaign.name}</span>
                    <span className="text-muted"> · {campaign.status}</span>
                    <div className="text-muted mt-1 text-xs">
                      {campaign.leadCount} leads · {campaign.agentCount} agents
                      {campaign.agentNames.length > 0
                        ? ` · ${campaign.agentNames.slice(0, 3).join(", ")}`
                        : ""}
                    </div>
                  </label>
                ))}
              </div>
              {selectedCampaign ? (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{selectedCampaign.name}</p>
                  <p className="text-muted mt-1">
                    Current lead count: {selectedCampaign.leadCount} · Assigned agents:{" "}
                    {selectedCampaign.agentNames.join(", ") || "None"} · Status:{" "}
                    {selectedCampaign.status}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                Campaign Name *
                <input
                  className="mx-input mt-1 w-full"
                  value={newCampaign.name}
                  onChange={(event) =>
                    setNewCampaign((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="text-sm">
                Source *
                <input
                  className="mx-input mt-1 w-full"
                  value={newCampaign.source}
                  onChange={(event) =>
                    setNewCampaign((current) => ({ ...current, source: event.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                Priority *
                <select
                  className="mx-input mt-1 w-full"
                  value={newCampaign.priority}
                  onChange={(event) =>
                    setNewCampaign((current) => ({ ...current, priority: event.target.value }))
                  }
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                Description
                <textarea
                  className="mx-input mt-1 w-full"
                  rows={3}
                  value={newCampaign.description}
                  onChange={(event) =>
                    setNewCampaign((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="mx-btn mx-btn-secondary"
              onClick={() => {
                setStep("duplicates");
                setProgress(28);
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="mx-btn mx-btn-primary"
              disabled={
                campaignMode === "existing"
                  ? !campaignId
                  : newCampaign.name.trim().length < 2
              }
              onClick={() => {
                setStep("agents");
                setProgress(56);
                if (selectedCampaign && selectedAgentIds.length === 0) {
                  // Prefill nothing — user picks agents next.
                }
              }}
            >
              Continue to agents
            </button>
          </div>
        </div>
      ) : null}

      {step === "agents" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">Select one or more active callers/agents.</p>
          <div className="mx-scroll overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-sunken text-xs">
                <tr>
                  <th className="px-3 py-2">Select</th>
                  <th className="px-3 py-2">Agent</th>
                  <th className="px-3 py-2">Open Leads</th>
                  <th className="px-3 py-2">Completed</th>
                  <th className="px-3 py-2">Workload</th>
                  <th className="px-3 py-2">Availability</th>
                </tr>
              </thead>
              <tbody>
                {activeAgents.map((agent) => {
                  const workload = agent.openLeads + agent.completedLeads;
                  return (
                    <tr key={agent.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedAgentIds.includes(agent.id)}
                          onChange={() => toggleAgent(agent.id)}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{agent.fullName}</td>
                      <td className="px-3 py-2">{agent.openLeads}</td>
                      <td className="px-3 py-2">{agent.completedLeads}</td>
                      <td className="px-3 py-2">{workload}</td>
                      <td className="px-3 py-2">{agent.availability}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="mx-btn mx-btn-secondary"
              onClick={() => {
                setStep("campaign");
                setProgress(42);
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="mx-btn mx-btn-primary"
              disabled={selectedAgentIds.length === 0}
              onClick={() => {
                if (!manualAssigneeUserId) {
                  setManualAssigneeUserId(selectedAgentIds[0] ?? "");
                }
                setStep("distribution");
                setProgress(70);
              }}
            >
              Continue to distribution
            </button>
          </div>
        </div>
      ) : null}

      {step === "distribution" ? (
        <div className="flex flex-col gap-4">
          <label className="text-sm">
            Distribution strategy
            <select
              className="mx-input mt-1 w-full"
              value={distributionStrategy}
              onChange={(event) =>
                setDistributionStrategy(event.target.value as typeof distributionStrategy)
              }
            >
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="EQUAL">Equal Distribution</option>
              <option value="RANDOM">Random Balanced</option>
              <option value="MANUAL">Manual Assignment</option>
            </select>
          </label>
          {distributionStrategy === "MANUAL" ? (
            <label className="text-sm">
              Assign all to
              <select
                className="mx-input mt-1 w-full"
                value={manualAssigneeUserId}
                onChange={(event) => setManualAssigneeUserId(event.target.value)}
              >
                {selectedAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {distributionPreview ? (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium">
                Preview · {distributionPreview.totalLeads} leads
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {distributionPreview.agents
                  .filter((agent) => agent.leadCount > 0 || selectedAgentIds.includes(agent.userId))
                  .map((agent) => (
                    <li key={agent.userId} className="flex justify-between border-b border-border pb-2 last:border-0">
                      <span>{agent.fullName}</span>
                      <span className="font-medium">{agent.leadCount} leads</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="mx-btn mx-btn-secondary"
              onClick={() => {
                setStep("agents");
                setProgress(56);
              }}
              disabled={pending}
            >
              Back
            </button>
            <button
              type="button"
              className="mx-btn mx-btn-primary"
              onClick={runImport}
              disabled={pending || selectedAgentIds.length === 0}
            >
              {pending ? "Importing…" : `Import ${importableCount} lead(s)`}
            </button>
          </div>
        </div>
      ) : null}

      {step === "summary" && result ? (
        <div className="flex flex-col gap-4">
          {result.error ? <p className="text-sm text-danger">{result.error}</p> : null}
          {result.success ? <p className="text-sm text-success">{result.success}</p> : null}
          {result.summary ? (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Imported</dt>
                  <dd className="font-medium">{result.summary.created}</dd>
                </div>
                <div>
                  <dt className="text-muted">Duplicates skipped</dt>
                  <dd className="font-medium">{result.summary.duplicates}</dd>
                </div>
                <div>
                  <dt className="text-muted">Updated</dt>
                  <dd className="font-medium">{result.summary.updated}</dd>
                </div>
                <div>
                  <dt className="text-muted">Failed</dt>
                  <dd className="font-medium">{result.summary.failed}</dd>
                </div>
                <div>
                  <dt className="text-muted">Skipped invalid</dt>
                  <dd className="font-medium">{result.summary.invalid}</dd>
                </div>
                <div>
                  <dt className="text-muted">Campaign</dt>
                  <dd className="font-medium">
                    {result.summary.campaignId
                      ? campaigns.find((c) => c.id === result.summary?.campaignId)?.name ??
                        result.summary.campaignId
                      : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Assigned Agents</dt>
                  <dd className="font-medium">
                    {result.summary.assignedAgentIds
                      .map(
                        (id) => agents.find((agent) => agent.id === id)?.fullName ?? id,
                      )
                      .join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Distribution</dt>
                  <dd className="font-medium">{result.summary.distributionStrategy ?? "—"}</dd>
                </div>
              </dl>
              {result.summary.auditNotes.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium">Audit Log</h3>
                  <ul className="text-muted mt-2 list-disc pl-5 text-xs">
                    {result.summary.auditNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.summary.sampleErrors.length > 0 ? (
                <ul className="text-muted list-disc pl-5 text-xs">
                  {result.summary.sampleErrors.map((item) => (
                    <li key={`${item.rowNumber}-${item.message}`}>
                      Row {item.rowNumber}: {item.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
          <button type="button" className="mx-btn mx-btn-secondary self-start" onClick={resetWizard}>
            Import another file
          </button>
        </div>
      ) : null}

      {parseError ? <p className="text-sm text-danger">{parseError}</p> : null}
      {/* Keep csvText referenced so future server-side CSV path stays wired. */}
      {csvText && step === "upload" ? null : null}
    </div>
  );
}
