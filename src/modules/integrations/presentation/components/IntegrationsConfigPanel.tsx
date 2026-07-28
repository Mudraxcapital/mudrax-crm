"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import type { IntegrationCatalogEntry } from "@/modules/integrations/catalog";
import {
  disableConnectionAction,
  enableConnectionAction,
  saveMappingsAction,
  saveMetaAdsConfigAction,
} from "../controllers/integrations.actions";

export interface ConnectionView {
  id: string;
  catalogCode: string;
  displayName: string;
  status: string;
  leadCenterSource: string | null;
}

export interface MappingView {
  connectionId: string;
  externalField: string;
  internalField: string;
  isRequired: boolean;
}

export interface MetaAdsConfigView {
  pageId: string;
  verifyTokenSet: boolean;
  pageAccessTokenSet: boolean;
  appSecretSet: boolean;
  graphVersion: string;
  formIds: string;
}

export function IntegrationsConfigPanel({
  catalog,
  connections,
  mappingsByConnection,
  metaAdsConfig,
  metaWebhookUrl,
  canManage,
}: {
  catalog: IntegrationCatalogEntry[];
  connections: ConnectionView[];
  mappingsByConnection: Record<string, MappingView[]>;
  metaAdsConfig: MetaAdsConfigView | null;
  metaWebhookUrl: string;
  canManage: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const connectionByCode = new Map(connections.map((c) => [c.catalogCode, c]));

  const categories = [
    { id: "inbound_leads" as const, label: "Lead sources" },
    { id: "messaging" as const, label: "Messaging" },
  ];

  function run(
    action: (
      prev: undefined,
      formData: FormData,
    ) => Promise<{
      error?: string;
      success?: string;
    }>,
    fields: Record<string, string>,
  ) {
    startTransition(async () => {
      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) form.set(key, value);
      const result = await action(undefined, form);
      setMessage(result.error ?? result.success ?? null);
    });
  }

  return (
    <div className="mt-6 space-y-8">
      {message ? <p className="text-sm">{message}</p> : null}

      {categories.map((category) => {
        const entries = catalog.filter((entry) => entry.category === category.id);
        if (entries.length === 0) return null;
        return (
          <section key={category.id}>
            <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
              {category.label}
            </h2>
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
              {entries.map((entry) => {
                const connection = connectionByCode.get(entry.code);
                const enabled = connection?.status === "ENABLED";
                return (
                  <li key={entry.code} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{entry.label}</p>
                        <p className="text-muted mt-0.5 text-xs">{entry.description}</p>
                        {entry.leadCenterSource ? (
                          <p className="text-muted mt-1 text-xs">
                            Lead Center source: {entry.leadCenterSource}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={entry.available ? (enabled ? "success" : "info") : "neutral"}>
                          {!entry.available
                            ? "Coming soon"
                            : enabled
                              ? "Enabled"
                              : "Available"}
                        </Badge>
                        {canManage && entry.available ? (
                          enabled ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                run(disableConnectionAction, {
                                  connectionId: connection!.id,
                                })
                              }
                            >
                              Disable
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                run(enableConnectionAction, { catalogCode: entry.code })
                              }
                            >
                              Enable
                            </Button>
                          )
                        ) : null}
                      </div>
                    </div>

                    {canManage &&
                    enabled &&
                    connection &&
                    entry.code === "facebook_lead_ads" &&
                    metaAdsConfig ? (
                      <MetaAdsConfigForm
                        connectionId={connection.id}
                        webhookUrl={metaWebhookUrl}
                        initial={metaAdsConfig}
                        disabled={pending}
                        onSave={(fields) => run(saveMetaAdsConfigAction, fields)}
                      />
                    ) : null}

                    {canManage && enabled && connection && entry.leadCenterSource ? (
                      <div className="mt-3 rounded border border-border p-3">
                        <p className="text-xs font-medium">Field mappings</p>
                        <MappingEditor
                          connectionId={connection.id}
                          initial={mappingsByConnection[connection.id] ?? []}
                          disabled={pending}
                          onSave={(mappingsJson) =>
                            run(saveMappingsAction, {
                              connectionId: connection.id,
                              mappingsJson,
                            })
                          }
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function MetaAdsConfigForm({
  connectionId,
  webhookUrl,
  initial,
  disabled,
  onSave,
}: {
  connectionId: string;
  webhookUrl: string;
  initial: MetaAdsConfigView;
  disabled: boolean;
  onSave: (fields: Record<string, string>) => void;
}) {
  const [pageId, setPageId] = useState(initial.pageId);
  const [verifyToken, setVerifyToken] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [graphVersion, setGraphVersion] = useState(initial.graphVersion);
  const [formIds, setFormIds] = useState(initial.formIds);

  return (
    <div className="mt-3 space-y-3 rounded border border-border p-3">
      <p className="text-xs font-medium">Meta Ads settings</p>
      <p className="text-muted text-xs">
        Callback URL (subscribe Page → <code>leadgen</code>):
      </p>
      <code className="block break-all rounded bg-muted/40 px-2 py-1 text-xs">{webhookUrl}</code>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">
          <span className="text-muted mb-1 block">Page ID</span>
          <input
            className="w-full rounded border border-border px-2 py-1 text-sm"
            value={pageId}
            disabled={disabled}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="Facebook Page ID"
          />
        </label>
        <label className="text-xs">
          <span className="text-muted mb-1 block">
            Verify token {initial.verifyTokenSet ? "(saved — leave blank to keep)" : ""}
          </span>
          <input
            className="w-full rounded border border-border px-2 py-1 text-sm"
            value={verifyToken}
            disabled={disabled}
            onChange={(e) => setVerifyToken(e.target.value)}
            placeholder="hub.verify_token value"
            autoComplete="off"
          />
        </label>
        <label className="text-xs">
          <span className="text-muted mb-1 block">
            Page access token{" "}
            {initial.pageAccessTokenSet ? "(saved — leave blank to keep)" : ""}
          </span>
          <input
            className="w-full rounded border border-border px-2 py-1 text-sm"
            type="password"
            value={pageAccessToken}
            disabled={disabled}
            onChange={(e) => setPageAccessToken(e.target.value)}
            placeholder="EAAG…"
            autoComplete="off"
          />
        </label>
        <label className="text-xs">
          <span className="text-muted mb-1 block">
            App secret {initial.appSecretSet ? "(saved — leave blank to keep)" : "(recommended)"}
          </span>
          <input
            className="w-full rounded border border-border px-2 py-1 text-sm"
            type="password"
            value={appSecret}
            disabled={disabled}
            onChange={(e) => setAppSecret(e.target.value)}
            placeholder="For X-Hub-Signature-256"
            autoComplete="off"
          />
        </label>
        <label className="text-xs">
          <span className="text-muted mb-1 block">Form IDs (optional filter)</span>
          <input
            className="w-full rounded border border-border px-2 py-1 text-sm"
            value={formIds}
            disabled={disabled}
            onChange={(e) => setFormIds(e.target.value)}
            placeholder="comma-separated"
          />
        </label>
        <label className="text-xs">
          <span className="text-muted mb-1 block">Graph API version (optional)</span>
          <input
            className="w-full rounded border border-border px-2 py-1 text-sm"
            value={graphVersion}
            disabled={disabled}
            onChange={(e) => setGraphVersion(e.target.value)}
            placeholder="v21.0"
          />
        </label>
      </div>

      <Button
        type="button"
        size="sm"
        disabled={disabled}
        onClick={() =>
          onSave({
            connectionId,
            pageId,
            verifyToken,
            pageAccessToken,
            appSecret,
            graphVersion,
            formIds,
          })
        }
      >
        Save Meta settings
      </Button>
    </div>
  );
}

function MappingEditor({
  connectionId,
  initial,
  disabled,
  onSave,
}: {
  connectionId: string;
  initial: MappingView[];
  disabled: boolean;
  onSave: (mappingsJson: string) => void;
}) {
  const [rows, setRows] = useState(
    initial.length > 0
      ? initial
      : [
          {
            connectionId,
            externalField: "full_name",
            internalField: "full_name",
            isRequired: true,
          },
          {
            connectionId,
            externalField: "phone_number",
            internalField: "phone",
            isRequired: false,
          },
          {
            connectionId,
            externalField: "email",
            internalField: "email",
            isRequired: false,
          },
        ],
  );

  return (
    <div className="mt-2 space-y-2">
      {rows.map((row, index) => (
        <div key={`${row.externalField}-${index}`} className="flex flex-wrap gap-2">
          <input
            className="rounded border border-border px-2 py-1 text-xs"
            value={row.externalField}
            disabled={disabled}
            onChange={(e) => {
              const next = [...rows];
              next[index] = { ...row, externalField: e.target.value };
              setRows(next);
            }}
            placeholder="external"
            aria-label="External field"
          />
          <span className="text-muted self-center text-xs">→</span>
          <input
            className="rounded border border-border px-2 py-1 text-xs"
            value={row.internalField}
            disabled={disabled}
            onChange={(e) => {
              const next = [...rows];
              next[index] = { ...row, internalField: e.target.value };
              setRows(next);
            }}
            placeholder="internal"
            aria-label="Internal field"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() =>
            setRows([
              ...rows,
              {
                connectionId,
                externalField: "",
                internalField: "",
                isRequired: false,
              },
            ])
          }
        >
          Add mapping
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => onSave(JSON.stringify(rows))}
        >
          Save mappings
        </Button>
      </div>
    </div>
  );
}
