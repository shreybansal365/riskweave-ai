import { useQuery } from "@tanstack/react-query";

import { quantumApi } from "../api/riskweave";
import { useAuth } from "../app/use-auth";
import {
  Badge,
  EnterpriseTable,
  ErrorState,
  LoadingSkeleton,
  MetricCard,
  PageHeader,
  Panel,
  ScoreDisplay,
} from "../components/ui";
import { formatDateTime, titleCase } from "../lib/format";

export function QuantumReadinessPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const summary = useQuery({
    queryKey: ["quantum", "summary"],
    queryFn: ({ signal }) => quantumApi.summary(token, signal),
  });
  const assets = useQuery({
    queryKey: ["quantum", "assets"],
    queryFn: ({ signal }) => quantumApi.assets(token, signal),
  });
  if (summary.isPending || assets.isPending)
    return <LoadingSkeleton label="Loading quantum readiness inventory" />;
  if (summary.isError || assets.isError)
    return (
      <ErrorState
        message="Quantum-exposure readiness data could not be loaded."
        onRetry={() => {
          void summary.refetch();
          void assets.refetch();
        }}
      />
    );
  return (
    <>
      <PageHeader
        eyebrow="Cryptographic migration posture"
        title="Quantum readiness"
        description="Prioritize transaction-channel cryptographic assets for migration based on sensitivity, confidentiality lifetime, algorithm family, and current PQC readiness."
      />
      <div className="separation-banner">
        <strong>Separate control plane.</strong> Quantum-exposure readiness is assessed
        independently and never modifies an incident’s fraud-risk score.
      </div>
      <section className="metric-grid metric-grid--four">
        <MetricCard
          label="Tracked assets"
          value={summary.data.total_assets}
          context="Synthetic crypto inventory"
        />
        <MetricCard
          label="Linked channels"
          value={summary.data.linked_transaction_channels}
          context="Queryable transaction relationships"
          tone="teal"
        />
        <MetricCard
          label="PQC ready"
          value={summary.data.pqc_ready_assets}
          context="Assets marked ready"
          tone="green"
        />
        <MetricCard
          label="Urgent priority"
          value={summary.data.readiness_priority_counts.urgent}
          context="Migration attention required"
          tone="red"
        />
      </section>
      <div className="quantum-summary-grid">
        <Panel
          title="Migration-priority distribution"
          eyebrow="Transparent readiness service"
        >
          <div className="priority-bars">
            {Object.entries(summary.data.readiness_priority_counts).map(
              ([level, count]) => (
                <div key={level}>
                  <span>{titleCase(level)}</span>
                  <div>
                    <i
                      style={{
                        width: `${String(summary.data.total_assets === 0 ? 0 : (count / summary.data.total_assets) * 100)}%`,
                      }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              ),
            )}
          </div>
        </Panel>
        <Panel title="Highest-priority assets" eyebrow="Explainable migration queue">
          <div className="priority-list">
            {summary.data.highest_priority_assets.map((asset) => (
              <article key={asset.crypto_asset_id}>
                <ScoreDisplay
                  label={titleCase(asset.readiness_priority_level)}
                  score={asset.readiness_priority_score}
                />
                <span>
                  <strong>{asset.name}</strong>
                  <small>
                    {titleCase(asset.algorithm_family)} · {asset.confidentiality_years}y
                    confidentiality
                  </small>
                </span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
      <section className="queue-panel" aria-labelledby="asset-inventory-title">
        <header>
          <div>
            <p className="panel-eyebrow">Channel-linked assets</p>
            <h2 id="asset-inventory-title">Cryptographic inventory</h2>
          </div>
          <Badge value="Synthetic readiness data" tone="blue" />
        </header>
        <EnterpriseTable label="Quantum readiness asset inventory">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Algorithm</th>
              <th>Sensitivity</th>
              <th>Confidentiality</th>
              <th>Linked channels</th>
              <th>PQC readiness</th>
              <th>Migration</th>
              <th>Priority</th>
              <th>Explanation</th>
            </tr>
          </thead>
          <tbody>
            {assets.data.items.map((asset) => (
              <tr key={asset.crypto_asset_id}>
                <td>
                  <strong>{asset.name}</strong>
                  <small>Assessed {formatDateTime(asset.assessed_at)}</small>
                </td>
                <td>{titleCase(asset.algorithm_family)}</td>
                <td>
                  <Badge
                    value={asset.data_sensitivity}
                    tone={asset.data_sensitivity === "critical" ? "red" : "amber"}
                  />
                </td>
                <td>{asset.confidentiality_years} years</td>
                <td>
                  {asset.linked_channels
                    .map((channel) => channel.display_name)
                    .join(", ") || "Unlinked"}
                </td>
                <td>
                  <Badge
                    value={asset.pqc_ready ? "PQC ready" : "Not ready"}
                    tone={asset.pqc_ready ? "green" : "amber"}
                  />
                </td>
                <td>{titleCase(asset.migration_status)}</td>
                <td>
                  <ScoreDisplay
                    label={titleCase(asset.readiness_priority_level)}
                    score={asset.readiness_priority_score}
                  />
                </td>
                <td>
                  <ul className="reason-list">
                    {asset.migration_priority_reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </EnterpriseTable>
      </section>
      <div className="disclaimer-block">
        <strong>What this screen does not claim</strong>
        <p>{assets.data.active_attack_detection_disclaimer}</p>
        <p>{summary.data.fraud_risk_separation_notice}</p>
        <p>
          Harvest-now-decrypt-later exposure describes migration urgency for long-lived
          sensitive data; it is not evidence that an active attacker has been detected.
        </p>
      </div>
    </>
  );
}
