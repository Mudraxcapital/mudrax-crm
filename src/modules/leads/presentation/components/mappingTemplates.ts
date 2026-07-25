// Client-side reusable column mapping templates (localStorage).

export interface MappingTemplate {
  id: string;
  name: string;
  mapping: Partial<Record<string, string>>;
  createdAt: string;
}

const STORAGE_KEY = "mudrax.leadImport.mappingTemplates";

export function loadMappingTemplates(): MappingTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MappingTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMappingTemplate(
  name: string,
  mapping: Partial<Record<string, string>>,
): MappingTemplate {
  const templates = loadMappingTemplates();
  const template: MappingTemplate = {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled mapping",
    mapping,
    createdAt: new Date().toISOString(),
  };
  templates.unshift(template);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.slice(0, 20)));
  return template;
}

export function deleteMappingTemplate(id: string): void {
  const templates = loadMappingTemplates().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}
