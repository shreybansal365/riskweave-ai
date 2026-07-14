export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
}

export interface ReadinessResponse {
  status: "ready" | "not_ready";
  service: string;
  checks: {
    database: "reachable" | "unavailable";
    migrations: "current" | "pending" | "unknown";
  };
  revision: string | null;
}
