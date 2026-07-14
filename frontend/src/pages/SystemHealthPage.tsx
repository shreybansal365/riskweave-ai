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
  const integrity = useQuery({
    queryKey: ["system", "integrity"],
    queryFn: ({ signal }) => systemApi.integrity(token, signal),
    retry: 1,
  });
  const lastRefresh =
    health.isSuccess && ready.isSuccess && sources.isSuccess && integrity.isSuccess
      ? new Date(
          Math.min(
            health.dataUpdatedAt,
            ready.dataUpdatedAt,
            sources.dataUpdatedAt,
            integrity.dataUpdatedAt,
          ),
        ).toISOString()
      : null;
  const retry = () => {
    void health.refetch();
    void ready.refetch();
    void sources.refetch();
    void integrity.refetch();
  };
  if (health.isPending && ready.isPending && sources.isPending && integrity.isPending)
    return <LoadingSkeleton label="Checking service health" />;
  const backendAvailable = health.isSuccess;
  const databaseReady = ready.isSuccess && ready.data.status === "ready";
  return (
    <div
      className="system-health-ledger"
      data-system-ready={
        health.isSuccess && ready.isSuccess && sources.isSuccess && integrity.isSuccess
          ? "settled"
          : undefined
      }
    >
      <PageHeader
        eyebrow="Administration"
        title="System health"
        description="Service readiness, deterministic dataset integrity, and recovery context from authenticated backend state."
        variant="diagnostic"
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
            <p>Browser client available</p>
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
      {integrity.isError ? (
        <ErrorState
          title="Integrity context is unavailable"
          message="Service checks remain visible, but the authenticated deterministic-integrity projection did not answer."
          onRetry={() => void integrity.refetch()}
        />
      ) : integrity.isPending ? (
        <LoadingSkeleton label="Loading deterministic integrity context" />
      ) : (
        <>
          <section
            className="environment-ledger"
            aria-label="Authoritative environment context"
          >
            <div>
              <span>Environment</span>
              <strong>{integrity.data.runtime.environment_label}</strong>
              <small>{titleCase(integrity.data.runtime.deployment_mode)}</small>
            </div>
            <div>
              <span>API origin</span>
              <strong>{integrity.data.runtime.api_origin}</strong>
              <small>{titleCase(integrity.data.runtime.api_origin_scope)}</small>
            </div>
            <div>
              <span>Dataset</span>
              <strong>{integrity.data.dataset.version}</strong>
              <small>
                {integrity.data.dataset.exact_baseline_restored
                  ? "Exact baseline verified"
                  : "Showcase or modified state"}
              </small>
            </div>
            <div>
              <span>Simulation epoch</span>
              <strong>{formatDateTime(integrity.data.dataset.simulation_epoch)}</strong>
              <small>
                Seed: {integrity.data.dataset.generator_seed}; model:{" "}
                {integrity.data.dataset.model_seed}
              </small>
            </div>
          </section>
          <div className="integrity-grid">
            <Panel
              title="Dataset integrity"
              eyebrow="Current versus baseline manifest"
              variant="ledger"
            >
              <div className="integrity-counts">
                {Object.entries(integrity.data.dataset.current_counts).map(
                  ([entity, count]) => (
                    <div key={entity}>
                      <span>{titleCase(entity)}</span>
                      <strong>{formatNumber(count)}</strong>
                      <small>
                        Expected:{" "}
                        {formatNumber(
                          integrity.data.dataset.expected_baseline_counts[entity] ?? 0,
                        )}
                      </small>
                    </div>
                  ),
                )}
              </div>
              <dl className="integrity-meta">
                <div>
                  <dt>Current fingerprint</dt>
                  <dd>{integrity.data.dataset.current_fingerprint}</dd>
                </div>
                <div>
                  <dt>Latest reset fingerprint</dt>
                  <dd>
                    {integrity.data.dataset.latest_reset_fingerprint ??
                      "No reset recorded"}
                  </dd>
                </div>
              </dl>
            </Panel>
            <Panel
              title="Scenario state"
              eyebrow="Persisted deterministic runs"
              variant="ledger"
            >
              <div className="scenario-health-list">
                {integrity.data.scenarios.map((scenario) => (
                  <article key={scenario.scenario_key}>
                    <span>
                      <strong>{titleCase(scenario.scenario_key)}</strong>
                      <small>{titleCase(scenario.status)}</small>
                    </span>
                    <b>
                      {scenario.result_incident_id === null
                        ? "No result"
                        : "Result linked"}
                    </b>
                  </article>
                ))}
              </div>
              <div className="integrity-evidence">
                <span>
                  <small>Benchmark fixture</small>
                  <strong>{integrity.data.benchmark.fixture_version}</strong>
                  <em>{integrity.data.benchmark.case_count} cases</em>
                </span>
                <span>
                  <small>Latest audit event</small>
                  <strong>
                    {integrity.data.audit.latest_event === null
                      ? "No event reported"
                      : titleCase(integrity.data.audit.latest_event.event_type)}
                  </strong>
                  <em>
                    {integrity.data.audit.latest_event === null
                      ? "—"
                      : formatDateTime(integrity.data.audit.latest_event.created_at)}
                  </em>
                </span>
              </div>
            </Panel>
          </div>
        </>
      )}
      <Panel
        title="Source-system coverage"
        eyebrow="Persisted deterministic dataset"
        variant="open"
      >
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
          <dd>{integrity.data?.runtime.environment_label ?? "Not reported"}</dd>
        </div>
        <div>
          <dt>Last successful complete refresh</dt>
          <dd>
            {lastRefresh === null ? "Not yet completed" : formatDateTime(lastRefresh)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
