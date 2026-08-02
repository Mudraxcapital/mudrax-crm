export function formatPhone(phone: string | null | undefined): string {
  const trimmed = phone?.trim();
  if (!trimmed) return "Phone missing";
  return trimmed;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function stageTone(
  bucket: string | undefined,
): "pending" | "active" | "closed" | "neutral" {
  if (bucket === "INITIAL") return "pending";
  if (bucket === "ACTIVE") return "active";
  if (bucket === "CLOSED") return "closed";
  return "neutral";
}

export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isSameLocalDay(iso: string, day = startOfToday()): boolean {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return false;
  return (
    value.getFullYear() === day.getFullYear() &&
    value.getMonth() === day.getMonth() &&
    value.getDate() === day.getDate()
  );
}

export function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
