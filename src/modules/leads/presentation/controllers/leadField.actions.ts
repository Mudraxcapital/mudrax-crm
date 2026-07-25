"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  archiveLeadField,
  createLeadField,
  createLeadFieldSchema,
  hideLeadField,
  LeadFieldKeyConflictError,
  LeadFieldNameConflictError,
  LeadFieldNotFoundError,
  ProtectedLeadFieldError,
  reorderLeadFieldsSchema,
  reorderLeadFields,
  restoreLeadField,
  showLeadField,
  updateLeadField,
  updateLeadFieldSchema,
} from "@/modules/leads";

export interface LeadFieldFormState {
  error?: string;
  success?: string;
}

function parseBoolean(value: FormDataEntryValue | null, fallback = false): boolean {
  if (value == null) return fallback;
  return value === "true" || value === "on" || value === "1";
}

function parseOptions(raw: FormDataEntryValue | null): string[] | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return raw
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseValidationRules(formData: FormData) {
  const minLength = formData.get("minLength");
  const maxLength = formData.get("maxLength");
  const min = formData.get("min");
  const max = formData.get("max");
  const pattern = formData.get("pattern");
  const patternMessage = formData.get("patternMessage");
  const rules: Record<string, unknown> = {};
  if (typeof minLength === "string" && minLength) rules.minLength = Number(minLength);
  if (typeof maxLength === "string" && maxLength) rules.maxLength = Number(maxLength);
  if (typeof min === "string" && min) rules.min = Number(min);
  if (typeof max === "string" && max) rules.max = Number(max);
  if (typeof pattern === "string" && pattern.trim()) rules.pattern = pattern.trim();
  if (typeof patternMessage === "string" && patternMessage.trim()) {
    rules.patternMessage = patternMessage.trim();
  }
  return Object.keys(rules).length > 0 ? rules : null;
}

export async function createLeadFieldAction(
  _prev: LeadFieldFormState | undefined,
  formData: FormData,
): Promise<LeadFieldFormState> {
  const { session, authContext } = await requirePermission("custom_field.manage");

  const parsed = createLeadFieldSchema.safeParse({
    name: formData.get("name"),
    internalKey: formData.get("internalKey") || undefined,
    fieldType: formData.get("fieldType"),
    fieldGroup: formData.get("fieldGroup") || "SECONDARY",
    isRequired: parseBoolean(formData.get("isRequired")),
    isVisible: parseBoolean(formData.get("isVisible"), true),
    isSearchable: parseBoolean(formData.get("isSearchable")),
    isFilterable: parseBoolean(formData.get("isFilterable")),
    isImportable: parseBoolean(formData.get("isImportable"), true),
    isExportable: parseBoolean(formData.get("isExportable"), true),
    defaultValue: (formData.get("defaultValue") as string) || null,
    selectOptions: parseOptions(formData.get("selectOptions")),
    validationRules: parseValidationRules(formData),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createLeadField({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof LeadFieldKeyConflictError ||
      error instanceof LeadFieldNameConflictError ||
      error instanceof Error
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/crm/field-settings");
  revalidatePath("/leads");
  return { success: "Field created." };
}

export async function updateLeadFieldAction(
  id: string,
  _prev: LeadFieldFormState | undefined,
  formData: FormData,
): Promise<LeadFieldFormState> {
  const { session, authContext } = await requirePermission("custom_field.manage");

  const parsed = updateLeadFieldSchema.safeParse({
    name: formData.get("name") || undefined,
    fieldType: formData.get("fieldType") || undefined,
    fieldGroup: formData.get("fieldGroup") || undefined,
    isRequired: formData.has("isRequired") ? parseBoolean(formData.get("isRequired")) : undefined,
    isVisible: formData.has("isVisible") ? parseBoolean(formData.get("isVisible"), true) : undefined,
    isSearchable: formData.has("isSearchable")
      ? parseBoolean(formData.get("isSearchable"))
      : undefined,
    isFilterable: formData.has("isFilterable")
      ? parseBoolean(formData.get("isFilterable"))
      : undefined,
    isImportable: formData.has("isImportable")
      ? parseBoolean(formData.get("isImportable"), true)
      : undefined,
    isExportable: formData.has("isExportable")
      ? parseBoolean(formData.get("isExportable"), true)
      : undefined,
    defaultValue: formData.has("defaultValue")
      ? ((formData.get("defaultValue") as string) || null)
      : undefined,
    selectOptions: parseOptions(formData.get("selectOptions")),
    validationRules: parseValidationRules(formData),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateLeadField({
      id,
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof LeadFieldNotFoundError ||
      error instanceof ProtectedLeadFieldError ||
      error instanceof Error
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/crm/field-settings");
  revalidatePath("/leads");
  return { success: "Field updated." };
}

export async function hideLeadFieldAction(id: string): Promise<void> {
  const { session, authContext } = await requirePermission("custom_field.manage");
  await hideLeadField({
    id,
    organizationId: authContext.organizationId,
    actor: { actorType: "USER", actorId: session.user.id },
  });
  revalidatePath("/crm/field-settings");
  revalidatePath("/leads");
}

export async function showLeadFieldAction(id: string): Promise<void> {
  const { session, authContext } = await requirePermission("custom_field.manage");
  await showLeadField({
    id,
    organizationId: authContext.organizationId,
    actor: { actorType: "USER", actorId: session.user.id },
  });
  revalidatePath("/crm/field-settings");
  revalidatePath("/leads");
}

export async function archiveLeadFieldAction(id: string): Promise<void> {
  const { session, authContext } = await requirePermission("custom_field.manage");
  try {
    await archiveLeadField({
      id,
      organizationId: authContext.organizationId,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof ProtectedLeadFieldError) {
      return;
    }
    throw error;
  }
  revalidatePath("/crm/field-settings");
  revalidatePath("/leads");
}

export async function restoreLeadFieldAction(id: string): Promise<void> {
  const { session, authContext } = await requirePermission("custom_field.manage");
  await restoreLeadField({
    id,
    organizationId: authContext.organizationId,
    actor: { actorType: "USER", actorId: session.user.id },
  });
  revalidatePath("/crm/field-settings");
  revalidatePath("/leads");
}

export async function reorderLeadFieldsAction(
  _prev: LeadFieldFormState | undefined,
  formData: FormData,
): Promise<LeadFieldFormState> {
  const { session, authContext } = await requirePermission("custom_field.manage");
  const raw = formData.get("orderedIds");
  const orderedIds =
    typeof raw === "string"
      ? raw
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      : [];

  const parsed = reorderLeadFieldsSchema.safeParse({ orderedIds });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid order." };
  }

  await reorderLeadFields({
    organizationId: authContext.organizationId,
    input: parsed.data,
    actor: { actorType: "USER", actorId: session.user.id },
  });
  revalidatePath("/crm/field-settings");
  return { success: "Display order updated." };
}
