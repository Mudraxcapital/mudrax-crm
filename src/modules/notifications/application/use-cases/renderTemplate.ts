/** Simple `{{variable}}` substitution for Notification Template bodies/subjects. */
export function renderTemplateString(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = payload[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}
