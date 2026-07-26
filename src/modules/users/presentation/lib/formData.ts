/** Read a string FormData field (empty string when missing/non-string). */
export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
