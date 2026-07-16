import { createRandomUuid } from "./random";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | undefined;

export function configureUnauthorizedHandler(handler: UnauthorizedHandler | undefined) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string | null;
  readonly retryAfter: number | null;

  constructor(
    message: string,
    status: number,
    requestId: string | null,
    retryAfter: number | null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  token?: string | undefined;
  body?: unknown;
  signal?: AbortSignal | undefined;
  idempotencyKey?: string | undefined;
  acceptedStatuses?: readonly number[] | undefined;
}

function validationMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (typeof first?.msg === "string") return first.msg;
  }
  return "The service could not process this request.";
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  if (options.token !== undefined)
    headers.set("Authorization", `Bearer ${options.token}`);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.idempotencyKey !== undefined) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }

  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };
  if (options.body !== undefined) requestInit.body = JSON.stringify(options.body);
  if (options.signal !== undefined) requestInit.signal = options.signal;
  const response = await fetch(`${API_BASE_URL}${path}`, requestInit);
  const accepted = options.acceptedStatuses ?? [200];
  if (accepted.includes(response.status)) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  const requestId = response.headers.get("X-Request-ID");
  const retryHeader = response.headers.get("Retry-After");
  const retryAfter = retryHeader === null ? null : Number.parseInt(retryHeader, 10);
  let message = `Request failed with status ${response.status.toString()}.`;
  try {
    const payload = (await response.json()) as { detail?: unknown };
    message = validationMessage(payload.detail);
  } catch {
    // Preserve the safe status-based fallback when the response is not JSON.
  }

  if (response.status === 401 && options.token !== undefined) unauthorizedHandler?.();
  throw new ApiError(
    message,
    response.status,
    requestId,
    Number.isNaN(retryAfter) ? null : retryAfter,
  );
}

export function createIdempotencyKey(scope: string): string {
  return `${scope}-${createRandomUuid()}`;
}
