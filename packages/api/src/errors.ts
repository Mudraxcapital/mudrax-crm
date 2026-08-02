import type { AxiosError } from "axios";

export interface ApiErrorBody {
  error?: string;
  issues?: unknown;
  reason?: string;
}

export class MudraxApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(message: string, status: number, body: ApiErrorBody | null = null) {
    super(message);
    this.name = "MudraxApiError";
    this.status = status;
    this.body = body;
  }
}

export function normalizeAxiosError(error: unknown): never {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const body = (error.response?.data as ApiErrorBody | undefined) ?? null;
    const issueMessage = firstZodIssueMessage(body?.issues);
    const message =
      issueMessage ||
      (typeof body?.error === "string" && body.error) ||
      (typeof body?.reason === "string" && body.reason) ||
      error.message ||
      "Request failed";
    throw new MudraxApiError(message, status, body);
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new MudraxApiError("Unknown API error", 0, null);
}

function firstZodIssueMessage(issues: unknown): string | null {
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const first = issues[0];
  if (
    first &&
    typeof first === "object" &&
    "message" in first &&
    typeof (first as { message: unknown }).message === "string"
  ) {
    return (first as { message: string }).message;
  }
  return null;
}

function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === "object" &&
    error !== null &&
    "isAxiosError" in error &&
    (error as AxiosError).isAxiosError === true
  );
}
