// ============================================================================
// src/infra/logger/logger.ts
//
// Lightweight structured logger for production. Levels: INFO, WARN, ERROR,
// AUDIT, SECURITY. Never log secrets (passwords, tokens, AUTH_SECRET, etc.).
// ============================================================================

export type LogLevel = "INFO" | "WARN" | "ERROR" | "AUDIT" | "SECURITY";

export interface LogContext {
  requestId?: string | null;
  correlationId?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  component?: string;
  [key: string]: unknown;
}

const SECRET_KEY_PATTERN =
  /(password|passwd|secret|token|authorization|cookie|api[_-]?key|private[_-]?key|credential)/i;

function redact(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = redact(nested);
    }
  }
  return out;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ? (redact(context) as LogContext) : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "ERROR" || level === "SECURITY") {
    console.error(line);
  } else if (level === "WARN") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => emit("INFO", message, context),
  warn: (message: string, context?: LogContext) => emit("WARN", message, context),
  error: (message: string, context?: LogContext) => emit("ERROR", message, context),
  audit: (message: string, context?: LogContext) => emit("AUDIT", message, context),
  security: (message: string, context?: LogContext) => emit("SECURITY", message, context),
};
