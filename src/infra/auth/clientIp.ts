/** First client address from an X-Forwarded-For header value. */
export function clientIpFromForwarded(header: string | null | undefined): string | null {
  if (!header) return null;
  return header.split(",")[0]?.trim() || null;
}
