import { requestJson } from "../../lib/api-client";
import type { HealthResponse, ReadinessResponse } from "../../types/system";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    isRecord(value) &&
    value["status"] === "ok" &&
    typeof value["service"] === "string" &&
    typeof value["version"] === "string"
  );
}

function isReadinessResponse(value: unknown): value is ReadinessResponse {
  if (!isRecord(value) || !isRecord(value["checks"])) {
    return false;
  }

  const database = value["checks"]["database"];
  const migrations = value["checks"]["migrations"];
  return (
    (value["status"] === "ready" || value["status"] === "not_ready") &&
    typeof value["service"] === "string" &&
    (database === "reachable" || database === "unavailable") &&
    (migrations === "current" || migrations === "pending" || migrations === "unknown") &&
    (typeof value["revision"] === "string" || value["revision"] === null)
  );
}

export async function fetchHealth(signal: AbortSignal): Promise<HealthResponse> {
  const payload = await requestJson("/health", signal);
  if (!isHealthResponse(payload)) {
    throw new TypeError("The API returned an invalid health response");
  }
  return payload;
}

export async function fetchReadiness(signal: AbortSignal): Promise<ReadinessResponse> {
  const payload = await requestJson("/ready", signal, [200, 503]);
  if (!isReadinessResponse(payload)) {
    throw new TypeError("The API returned an invalid readiness response");
  }
  return payload;
}
