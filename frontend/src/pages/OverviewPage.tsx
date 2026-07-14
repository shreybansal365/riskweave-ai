import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { dashboardApi, incidentsApi } from "../api/riskweave";
import { useAuth } from "../app/use-auth";
import {
  IncidentVolumeChart,
  RiskTrendChart,
  SeverityDistributionChart,
  TransactionActionsChart,
} from "../components/charts";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MetricCard,
  PageHeader,
  Panel,
  RiskBadge,
  ServiceStatusIndicator,
} from "../components/ui";
import { formatDateTime, formatNumber } from "../lib/format";

export function OverviewPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const summary = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: ({ signal }) => dashboardApi.summary(token, signal),
  });
  const trends = useQuery({
    queryKey: ["dashboard", "trends"],
    queryFn: ({ signal }) => dashboardApi.trends(token, signal),
  });
  const recent = useQuery({
    queryKey: ["incidents", "recent-high-risk"],
    queryFn: ({ signal }) =>
      incidentsApi.list(
        token,
        { page: 1, pageSize: 5, sortBy: "fused_score", sortDirection: "desc" },
        signal,
      ),
  });

  if (summary.isPending || trends.isPending || recent.isPending)
    return <LoadingSkeleton />;
  if (summary.isError || trends.isError || recent.isError) {
    return (
      <ErrorState
        message="The overview could not reconcile its source-backed aggregates."
        onRetry={() => {
          void summary.refetch();
          void trends.refetch();
          void recent.refetch();
        }}
      />
    );
  }

  const criticalHigh =
    summary.data.incidents_by_severity.critical + summary.data.incidents_by_severity.high;
  const activeCases = summary.data.open_incidents + summary.data.in_review_incidents;
  const totalActions = trends.data.points.reduce(
    (total, point) =>
      total +
      point.transaction_actions.permitted +
      point.transaction_actions.held +
      point.transaction_actions.released +
      point.transaction_actions.declined +
      point.transaction_actions.pending +
      point.transaction_actions.cancelled,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Contextual risk operations"
        title="Operational overview"
        description="A source-backed view of synthetic incidents, intervention outcomes, and service health across the fixed 14-day evaluation window."
      />

      <section className="metric-grid" aria-label="Operational metrics">
        <MetricCard
          label="Visible incidents"
          value={formatNumber(summary.data.visible_incidents)}
          context="Persisted cases in the current dataset"
        />
        <MetricCard
          label="High or critical"
          value={criticalHigh}
          context="Cases requiring intervention"
          tone="red"
        />
        <MetricCard
          label="Open or in review"
          value={activeCases}
          context="Current analyst workload"
          tone="amber"
        />
        <MetricCard
          label="Transactions held"
          value={summary.data.transactions_held}
          context="Persisted transaction state"
          tone="red"
        />
        <MetricCard
          label="Unusual but permitted"
          value={summary.data.legitimate_unusual_activity_permitted}
          context="Context avoided unnecessary intervention"
          tone="green"
        />
        <MetricCard
          label="Confirmed fraud"
          value={summary.data.confirmed_fraud_cases}
          context="Analyst-confirmed synthetic cases"
          tone="teal"
        />
      </section>

      <div className="overview-grid overview-grid--wide">
        <Panel
          title="Incident volume"
          eyebrow="14-day operational cadence"
          aside={
            <span className="panel-stat">{summary.data.visible_incidents} total</span>
          }
        >
          <IncidentVolumeChart points={trends.data.points} />
          <p className="chart-summary">
            Incident volume is shown per UTC day from persisted records, not a client
            projection.
          </p>
        </Panel>
        <Panel title="Severity distribution" eyebrow="Current case mix">
          <SeverityDistributionChart counts={summary.data.incidents_by_severity} />
          <p className="chart-summary">
            High and critical cases represent {criticalHigh} of{" "}
            {summary.data.visible_incidents} visible incidents.
          </p>
        </Panel>
      </div>

      <div className="overview-grid">
        <Panel title="Risk stream movement" eyebrow="Cyber · transaction · fused">
          <RiskTrendChart points={trends.data.points} />
          <p className="chart-summary">
            Daily averages preserve the server’s authoritative cyber, transaction, and
            fused scores.
          </p>
        </Panel>
        <Panel title="Transaction actions" eyebrow="Outcome distribution">
          <TransactionActionsChart points={trends.data.points} />
          <p className="chart-summary">
            {totalActions} transaction outcomes are represented across the evaluation
            window.
          </p>
        </Panel>
      </div>

      <div className="overview-grid overview-grid--lower">
        <Panel title="Priority investigations" eyebrow="Highest fused score">
          {recent.data.items.length === 0 ? (
            <EmptyState
              title="No visible incidents"
              message="The deterministic dataset currently contains no investigation records."
            />
          ) : (
            <div className="recent-list">
              {recent.data.items.map((incident) => (
                <Link
                  to={`/incidents/${incident.incident_id}`}
                  key={incident.incident_id}
                >
                  <span>
                    <strong>{incident.incident_reference}</strong>
                    <small>
                      {incident.customer_display_name} · {incident.account_reference}
                    </small>
                  </span>
                  <span className="recent-meta">
                    <RiskBadge severity={incident.severity} />
                    <b>{incident.fused_score}</b>
                    <small>{formatDateTime(incident.created_at)}</small>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Source systems" eyebrow="Persisted data coverage">
          <div className="source-health-list">
            {summary.data.source_systems.map((source) => (
              <article key={source.source}>
                <ServiceStatusIndicator
                  status={source.status === "healthy" ? "connected" : "degraded"}
                  label={source.status}
                />
                <span>
                  <strong>{source.source}</strong>
                  <small>{source.detail}</small>
                </span>
                <b>{formatNumber(source.record_count)}</b>
              </article>
            ))}
          </div>
        </Panel>
      </div>
      <p className="synthetic-notice">{summary.data.synthetic_data_notice}</p>
    </>
  );
}
