/** Hides leftover integration-test catalog rows from CRM UI selectors. */
const TEST_NAME = /^integration\s*test/i;

export function excludeTestCatalogRows<T extends { name: string }>(rows: T[]): T[] {
  return rows.filter((row) => !TEST_NAME.test(row.name.trim()));
}
