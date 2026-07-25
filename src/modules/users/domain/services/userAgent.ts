// ============================================================================
// Lightweight UA parsing for session device / browser labels.
// ============================================================================

export function parseUserAgent(userAgent: string | null | undefined): {
  device: string;
  browser: string;
} {
  if (!userAgent?.trim()) {
    return { device: "Unknown", browser: "Unknown" };
  }
  const ua = userAgent;
  const device = /Mobile|Android|iPhone|iPad|iPod/i.test(ua) ? "Mobile" : "Desktop";
  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  return { device, browser };
}

export function formatSessionDuration(loginAt: Date, endAt: Date | null): string {
  const end = endAt ?? new Date();
  const seconds = Math.max(0, Math.floor((end.getTime() - loginAt.getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}
