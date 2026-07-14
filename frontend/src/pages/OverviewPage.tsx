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
  StatusBadge,
} from "../components/ui";
import { formatDateTime, formatMoney, formatNumber, titleCase } from "../lib/format";

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

  if (summary.data.visible_incidents === 0 && recent.data.items.length === 0) {
    return (
      <div data-overview-ready="empty">
        <PageHeader
          eyebrow="Contextual risk operations"
          title="Operational overview"
          description="A source-backed view of synthetic incidents, intervention outcomes, and service health across the fixed 14-day evaluation window."
          variant="briefing"
        />
        <EmptyState
          title="No incidents in the current dataset"
          message="RiskWeave received a valid empty response from the persisted incident sources. Run a deterministic scenario or restore the baseline before investigating cases."
        />
      </div>
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
    <div className="overview-briefing" data-overview-ready="settled">
      <PageHeader
        eyebrow="Operations briefing"
        title="Operational overview"
        description="Cases requiring attention, intervention state, and source-backed evidence across the deterministic 14-day window."
        variant="briefing"
      />

      <section
        className="metric-grid metric-grid--primary"
        aria-label="Operational priorities"
      >
        <MetricCard
          label="High or critical"
          value={criticalHigh}
          context="Cases requiring intervention"
          tone="red"
          emphasis="primary"
        />
        <MetricCard
          label="Open or in review"
          value={activeCases}
          context="Current analyst workload"
          tone="amber"
          emphasis="primary"
        />
        <MetricCard
          label="Transactions held"
          value={summary.data.transactions_held}
          context="Persisted transaction state"
          tone="red"
          emphasis="primary"
        />
      </section>

      <section className="operational-ledger" aria-label="Controlled outcomes">
        <div>
          <span>Visible incidents</span>
          <strong>{formatNumber(summary.data.visible_incidents)}</strong>
          <small>Persisted cases</small>
        </div>
        <div>
          <span>Unusual but permitted</span>
          <strong>{summary.data.legitimate_unusual_activity_permitted}</strong>
          <small>Monitored without intervention</small>
        </div>
        <div>
          <span>Confirmed fraud</span>
          <strong>{summary.data.confirmed_fraud_cases}</strong>
          <small>Analyst-confirmed synthetic cases</small>
        </div>
      </section>

      <Panel
        title="Priority investigations"
        eyebrow="Cases requiring attention"
        variant="open"
        className="priority-investigations"
      >
        {recent.data.items.length === 0 ? (
          <EmptyState
            title="No visible incidents"
            message="The deterministic dataset currently contains no investigation records."
          />
        ) : (
          <div className="recent-list">
            {recent.data.items.map((incident) => (
              <Link to={`/incidents/${incident.incident_id}`} key={incident.incident_id}>
                <span className="recent-identity">
                  <strong>{incident.incident_reference}</strong>
                  <small>
                    {incident.customer_display_name} · {incident.account_reference}
                  </small>
                </span>
                <span className="recent-transaction">
                  <strong>{formatMoney(incident.amount_minor, incident.currency)}</strong>
                  <small>{titleCase(incident.recommended_action)}</small>
                </span>
                <span className="recent-meta">
                  <RiskBadge severity={incident.severity} />
                  <b>{incident.fused_score}</b>
                  <StatusBadge status={incident.transaction_status} />
                  <small>{formatDateTime(incident.created_at)}</small>
                </span>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <div className="overview-grid overview-grid--wide overview-analysis">
        <Panel
          title="Daily incident cadence"
          eyebrow="14-day UTC window"
          aside={
            <span className="panel-stat">{summary.data.visible_incidents} total</span>
          }
          variant="ledger"
        >
          <IncidentVolumeChart points={trends.data.points} />
          <p className="chart-summary">
            Discrete daily counts from persisted incident records.
          </p>
        </Panel>
        <Panel title="Severity distribution" eyebrow="Current case mix" variant="ledger">
          <SeverityDistributionChart counts={summary.data.incidents_by_severity} />
          <p className="chart-summary">
            High and critical cases represent {criticalHigh} of{" "}
            {summary.data.visible_incidents} visible incidents.
          </p>
        </Panel>
      </div>

      <div className="overview-grid overview-supporting">
        <Panel
          title="Daily average risk by stream"
          eyebrow="Not decision thresholds"
          variant="ledger"
        >
          <RiskTrendChart points={trends.data.points} />
          <p className="chart-summary">
            Daily averages preserve server-owned scores; they are not incident decision
            thresholds.
          </p>
        </Panel>
        <Panel
          title="Transaction actions"
          eyebrow="All persisted outcomes"
          variant="ledger"
        >
          <TransactionActionsChart points={trends.data.points} />
          <p className="chart-summary">
            {totalActions} transaction outcomes are represented across the evaluation
            window.
          </p>
        </Panel>
      </div>

      <div className="overview-grid overview-grid--lower">
        <Panel title="Source systems" eyebrow="Persisted data coverage" variant="open">
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
        <aside className="overview-method-note">
          <span>Data boundary</span>
          <strong>Deterministic synthetic evidence</strong>
          <p>{summary.data.synthetic_data_notice}</p>
        </aside>
      </div>
    </div>
  );
}
