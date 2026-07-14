import { useQuery } from "@tanstack/react-query";

import { dashboardApi, systemApi } from "../api/riskweave";
import { useAuth } from "../app/use-auth";
import { API_BASE_URL } from "../lib/api-client";
import { formatDateTime, formatNumber, titleCase } from "../lib/format";
import {
  Button,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  Panel,
  ServiceStatusIndicator,
} from "../components/ui";

export function SystemHealthPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const health = useQuery({
    queryKey: ["system", "health", "detail"],
    queryFn: ({ signal }) => systemApi.health(signal),
    retry: 1,
  });
  const ready = useQuery({
    queryKey: ["system", "ready", "detail"],
    queryFn: ({ signal }) => systemApi.readiness(signal),
    retry: 1,
  });
  const sources = useQuery({
    queryKey: ["dashboard", "summary", "health"],
    queryFn: ({ signal }) => dashboardApi.summary(token, signal),
    retry: 1,
  });
  const lastRefresh =
    health.isSuccess && ready.isSuccess && sources.isSuccess
      ? new Date(
          Math.min(health.dataUpdatedAt, ready.dataUpdatedAt, sources.dataUpdatedAt),
        ).toISOString()
      : null;
  const retry = () => {
    void health.refetch();
    void ready.refetch();
    void sources.refetch();
  };
  if (health.isPending && ready.isPending && sources.isPending)
    return <LoadingSkeleton label="Checking service health" />;
  const backendAvailable = health.isSuccess;
  const databaseReady = ready.isSuccess && ready.data.status === "ready";
  return (
    <>
      <PageHeader
        eyebrow="Administrator diagnostics"
        title="System health"
        description="Live liveness, readiness, migration, and persisted source status without fabricated green checks."
        actions={
          <Button type="button" onClick={retry}>
            Retry all checks
          </Button>
        }
      />
      {!backendAvailable && (
        <ErrorState
          title="Backend is waking or unavailable"
          message="The frontend is running, but the API did not answer. A free-tier backend may need a short wake-up period; retry without reloading the session."
          onRetry={retry}
        />
      )}
      <div className="health-grid">
        <article className="health-card">
          <ServiceStatusIndicator status="connected" label="Operational" />
          <span>
            <small>Frontend runtime</small>
            <strong>RiskWeave interface loaded</strong>
            <p>{import.meta.env.MODE} environment</p>
          </span>
        </article>
        <article className="health-card">
          <ServiceStatusIndicator
            status={backendAvailable ? "connected" : "degraded"}
            label={backendAvailable ? "Responding" : "Unavailable"}
          />
          <span>
            <small>Backend liveness</small>
            <strong>{health.data?.service ?? "RiskWeave API"}</strong>
            <p>
              {health.data === undefined
                ? API_BASE_URL
                : `Version ${health.data.version}`}
            </p>
          </span>
        </article>
        <article className="health-card">
          <ServiceStatusIndicator
            status={databaseReady ? "connected" : "degraded"}
            label={databaseReady ? "Ready" : "Attention"}
          />
          <span>
            <small>PostgreSQL readiness</small>
            <strong>
              {ready.data === undefined
                ? "No response"
                : titleCase(ready.data.checks.database)}
            </strong>
            <p>
              Migration{" "}
              {ready.data === undefined
                ? "unknown"
                : titleCase(ready.data.checks.migrations)}
            </p>
          </span>
        </article>
        <article className="health-card">
          <ServiceStatusIndicator
            status={
              ready.data?.revision === null || ready.data?.revision === undefined
                ? "degraded"
                : "connected"
            }
            label={
              ready.data?.revision === null || ready.data?.revision === undefined
                ? "Unknown"
                : "Current"
            }
          />
          <span>
            <small>Alembic revision</small>
            <strong>{ready.data?.revision ?? "Not reported"}</strong>
            <p>Database-backed readiness contract</p>
          </span>
        </article>
      </div>
      <Panel title="Source-system coverage" eyebrow="Persisted deterministic dataset">
        {sources.isError ? (
          <ErrorState
            message="Authenticated source-health data is unavailable."
            onRetry={() => void sources.refetch()}
          />
        ) : sources.isPending ? (
          <LoadingSkeleton />
        ) : (
          <div className="health-source-table">
            {sources.data.source_systems.map((source) => (
              <article key={source.source}>
                <ServiceStatusIndicator
                  status={source.status === "healthy" ? "connected" : "degraded"}
                  label={source.status}
                />
                <span>
                  <strong>{source.source}</strong>
                  <small>{source.detail}</small>
                </span>
                <b>{formatNumber(source.record_count)} records</b>
              </article>
            ))}
          </div>
        )}
      </Panel>
      <dl className="system-meta">
        <div>
          <dt>API origin</dt>
          <dd>{API_BASE_URL}</dd>
        </div>
        <div>
          <dt>Environment label</dt>
          <dd>{import.meta.env.MODE}</dd>
        </div>
        <div>
          <dt>Last successful complete refresh</dt>
          <dd>
            {lastRefresh === null ? "Not yet completed" : formatDateTime(lastRefresh)}
          </dd>
        </div>
      </dl>
    </>
  );
}
