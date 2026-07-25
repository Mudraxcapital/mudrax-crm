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
import type {
  DuplicateDetectionSummary,
  DuplicateResolutionMode,
} from "@/modules/leads/application/use-cases/detectImportDuplicates";
import {
  buildUnknownColumnSuggestions,
  type UnknownColumnSuggestion,
} from "../../application/services/detectImportFieldType";
import { LEAD_FIELD_TYPES } from "../../domain/entities/LeadFieldDefinition";
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
import { DuplicateReviewPanel } from "./DuplicateReviewPanel";

type Step =
  | "upload"
  | "mapping"
  | "fields"
  | "duplicates"
  | "campaign"
  | "agents"
  | "distribution"
  | "summary";

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "upload", label: "1. Upload" },
  { id: "mapping", label: "2. Mapping" },
  { id: "fields", label: "3. New Fields" },
  { id: "duplicates", label: "4. Duplicates" },
  { id: "campaign", label: "5. Campaign" },
  { id: "agents", label: "6. Agents" },
  { id: "distribution", label: "7. Distribution" },
  { id: "summary", label: "8. Summary" },
];

const IMPORT_FIELD_TYPES = LEAD_FIELD_TYPES.filter((type) =>
  [
    "TEXT",
    "TEXTAREA",
    "NUMBER",
    "CURRENCY",
    "PHONE",
    "EMAIL",
    "DROPDOWN",
    "BOOLEAN",
    "DATE",
    "DATE_TIME",
  ].includes(type),
);

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
    "phone",
  );
  const [duplicateResolution, setDuplicateResolution] =
    useState<DuplicateResolutionMode>("skip_duplicates");
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [duplicateSummary, setDuplicateSummary] = useState<DuplicateDetectionSummary | null>(null);
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
  const [unknownFields, setUnknownFields] = useState<UnknownColumnSuggestion[]>([]);
  const [pending, startTransition] = useTransition();

  const previewRows = useMemo(() => rows.slice(0, 8), [rows]);
  const ignoredHeaders = useMemo(() => unusedHeaders(headers, mapping), [headers, mapping]);
  const nameMapped = Boolean(mapping.full_name || mapping.name);
  const requiredMapped = nameMapped;
  const acceptedNewFields = useMemo(
    () => unknownFields.filter((field) => field.create),
    [unknownFields],
  );

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
    if (duplicateResolution === "skip_duplicates") {
      return duplicateSummary.newLeadCount;
    }
    if (
      duplicateResolution === "replace_selected_statuses" ||
      duplicateResolution === "archive_and_reimport"
    ) {
      const selected = new Set(selectedStageIds);
      const selectedDupes = duplicateSummary.allDuplicates.filter(
        (row) => row.existingStageId && selected.has(row.existingStageId),
      ).length;
      return duplicateSummary.newLeadCount + selectedDupes;
    }
    if (duplicateResolution === "update_existing" || duplicateResolution === "merge") {
      return duplicateSummary.newLeadCount + duplicateSummary.alreadyExisting;
    }
    // import_all
    return duplicateSummary.newLeadCount + duplicateSummary.alreadyExisting;
  }, [duplicateResolution, duplicateSummary, rows.length, selectedStageIds]);

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

  function goToFieldReview() {
    if (!nameMapped) {
      setParseError("Map Lead Name before continuing.");
      return;
    }
    setParseError(null);
    const suggestions = buildUnknownColumnSuggestions({
      unusedHeaders: ignoredHeaders,
      rows,
    });
    setUnknownFields(suggestions);
    if (suggestions.length === 0) {
      runDuplicateCheck();
      return;
    }
    setStep("fields");
    setProgress(22);
  }

  function runDuplicateCheck() {
    if (!nameMapped) {
      setParseError("Map Lead Name before continuing.");
      return;
    }
    setParseError(null);
    startTransition(async () => {
      const columnMapping = buildColumnMapping();
      // Provisional keys for accepted dynamic fields so duplicate preview sees mapped name/phone/email.
      for (const field of acceptedNewFields) {
        columnMapping[field.suggestedInternalKey] = field.excelHeader;
      }
      const response = await previewImportDuplicatesAction({
        rows,
        columnMapping,
        matchMode,
      });
      if (response.error) {
        setParseError(response.error);
        return;
      }
      setDuplicateSummary(response.summary ?? null);
      // Pre-select statuses that have duplicates for replace/archive convenience.
      setSelectedStageIds(
        (response.summary?.statusGroups ?? [])
          .filter((group) => group.count > 0)
          .map((group) => group.stageId),
      );
      setStep("duplicates");
      setProgress(36);
    });
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
        selectedStageIds:
          duplicateResolution === "replace_selected_statuses" ||
          duplicateResolution === "archive_and_reimport"
            ? selectedStageIds
            : undefined,
        agentUserIds: selectedAgentIds,
        distributionStrategy,
        manualAssigneeUserId:
          distributionStrategy === "MANUAL"
            ? manualAssigneeUserId || selectedAgentIds[0]
            : undefined,
        dynamicFields: acceptedNewFields.map((field) => ({
          excelHeader: field.excelHeader,
          name: field.suggestedName,
          internalKey: field.suggestedInternalKey,
          fieldType: field.fieldType as
            | "TEXT"
            | "TEXTAREA"
            | "NUMBER"
            | "CURRENCY"
            | "PHONE"
            | "EMAIL"
            | "DROPDOWN"
            | "BOOLEAN"
            | "DATE"
            | "DATE_TIME",
          selectOptions: field.selectOptions,
        })),
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
    setSelectedStageIds([]);
    setDuplicateResolution("skip_duplicates");
    setSelectedAgentIds([]);
    setBinaryBuffer(null);
    setCsvText(null);
    setUnknownFields([]);
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
            <span className="text-muted">
              {ignoredHeaders.length} unmapped column
              {ignoredHeaders.length === 1 ? "" : "s"} (review next)
            </span>
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
              onClick={goToFieldReview}
              disabled={!requiredMapped || pending}
            >
              {pending ? "Checking…" : "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "fields" ? (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-medium">Unknown Excel columns</h2>
            <p className="text-muted mt-1 text-sm">
              These headers are not mapped to existing CRM fields. Accept to create dynamic
              fields (Salesforce / HubSpot style). Values will import into Lead &amp; Customer
              detail, filters, search, and exports.
            </p>
          </div>

          {unknownFields.length === 0 ? (
            <p className="text-muted text-sm">No unknown columns — all headers are mapped.</p>
          ) : (
            <div className="mx-scroll overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Create</th>
                    <th className="px-3 py-2 font-medium">Excel Column</th>
                    <th className="px-3 py-2 font-medium">Field Name</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {unknownFields.map((field, index) => (
                    <tr key={field.excelHeader} className="border-t border-border align-top">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={field.create}
                          onChange={(event) =>
                            setUnknownFields((current) =>
                              current.map((item, i) =>
                                i === index ? { ...item, create: event.target.checked } : item,
                              ),
                            )
                          }
                          aria-label={`Create field for ${field.excelHeader}`}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{field.excelHeader}</td>
                      <td className="px-3 py-2">
                        <input
                          className="mx-input w-full min-w-[10rem]"
                          value={field.suggestedName}
                          disabled={!field.create}
                          onChange={(event) =>
                            setUnknownFields((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? { ...item, suggestedName: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <p className="text-muted mt-1 text-[11px]">
                          key: {field.suggestedInternalKey}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="mx-input w-full min-w-[8rem]"
                          value={field.fieldType}
                          disabled={!field.create}
                          onChange={(event) =>
                            setUnknownFields((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      fieldType: event.target
                                        .value as UnknownColumnSuggestion["fieldType"],
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          {IMPORT_FIELD_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-muted px-3 py-2 text-xs">
                        {field.sampleValue || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-success">✓ {acceptedNewFields.length} will be created</span>
            <span className="text-muted">
              {unknownFields.length - acceptedNewFields.length} ignored
            </span>
          </div>

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
              onClick={runDuplicateCheck}
              disabled={pending}
            >
              {pending ? "Checking…" : "Continue to duplicates"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "duplicates" && duplicateSummary ? (
        <DuplicateReviewPanel
          summary={duplicateSummary}
          fileName={fileName}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
          onRecheck={runDuplicateCheck}
          duplicateResolution={duplicateResolution}
          onResolutionChange={setDuplicateResolution}
          selectedStageIds={selectedStageIds}
          onSelectedStageIdsChange={setSelectedStageIds}
          pending={pending}
          onBack={() => {
            if (unknownFields.length > 0) {
              setStep("fields");
              setProgress(22);
            } else {
              setStep("mapping");
              setProgress(14);
            }
          }}
          onContinue={() => {
            setStep("campaign");
            setProgress(42);
          }}
        />
      ) : null}

      {step === "campaign" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium">Where should these leads from Excel go?</p>
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
              {pending ? "Adding…" : `Add ${importableCount} lead(s) from Excel`}
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
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted">Excel Rows</dt>
                  <dd className="font-medium">{result.summary.total}</dd>
                </div>
                <div>
                  <dt className="text-muted">Duplicates</dt>
                  <dd className="font-medium">{result.summary.duplicates}</dd>
                </div>
                <div>
                  <dt className="text-muted">Imported</dt>
                  <dd className="font-medium">{result.summary.created}</dd>
                </div>
                <div>
                  <dt className="text-muted">Skipped</dt>
                  <dd className="font-medium">{result.summary.skipped ?? result.summary.duplicates}</dd>
                </div>
                <div>
                  <dt className="text-muted">Replaced</dt>
                  <dd className="font-medium">{result.summary.replaced ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-muted">Archived</dt>
                  <dd className="font-medium">{result.summary.archived ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-muted">Failed</dt>
                  <dd className="font-medium">{result.summary.failed}</dd>
                </div>
                <div>
                  <dt className="text-muted">Invalid</dt>
                  <dd className="font-medium">{result.summary.invalid}</dd>
                </div>
                <div>
                  <dt className="text-muted">Updated</dt>
                  <dd className="font-medium">{result.summary.updated}</dd>
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
                <div>
                  <dt className="text-muted">New fields created</dt>
                  <dd className="font-medium">{result.summary.newFieldsCreated?.length ?? 0}</dd>
                </div>
              </dl>
              {(result.summary.newFieldsCreated?.length ?? 0) > 0 ? (
                <div>
                  <h3 className="text-sm font-medium">Fields</h3>
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    {result.summary.newFieldsCreated.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                  <p className="text-muted mt-2 text-xs">
                    Manage in CRM → Field Settings (edit, rename, hide, archive, validation).
                  </p>
                </div>
              ) : null}
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
              {result.summary.failedCsv && result.summary.failed > 0 ? (
                <button
                  type="button"
                  className="mx-btn mx-btn-secondary self-start"
                  onClick={() => {
                    const blob = new Blob([result.summary!.failedCsv!], {
                      type: "text/csv;charset=utf-8",
                    });
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = `${fileName.replace(/\.[^.]+$/, "")}-failed-rows.csv`;
                    anchor.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download Failed Rows
                </button>
              ) : null}
            </>
          ) : null}
          <button type="button" className="mx-btn mx-btn-secondary self-start" onClick={resetWizard}>
            Add another file from Excel
          </button>
        </div>
      ) : null}

      {parseError ? <p className="text-sm text-danger">{parseError}</p> : null}
      {/* Keep csvText referenced so future server-side CSV path stays wired. */}
      {csvText && step === "upload" ? null : null}
    </div>
  );
}
