import { useQuery } from "@tanstack/react-query";

import { benchmarkApi } from "../api/riskweave";
import { useAuth } from "../app/use-auth";
import {
  Badge,
  EnterpriseTable,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  Panel,
} from "../components/ui";
import { formatDecimal, titleCase } from "../lib/format";
import type { BenchmarkMethodMetrics, BenchmarkOperatingPoint } from "../types/api";

const methodNames = {
  isolated_cyber_rule_score: "Isolated cyber rule score",
  isolated_transaction_rule_score: "Isolated transaction rule score",
  fused_hybrid_contextual_score: "Fused hybrid contextual score",
} as const;

function MetricCells({ metrics }: { metrics: BenchmarkMethodMetrics }) {
  return (
    <>
      <td>{metrics.true_positives}</td>
      <td>{metrics.false_positives}</td>
      <td>{metrics.true_negatives}</td>
      <td>{metrics.false_negatives}</td>
      <td>{formatDecimal(metrics.precision)}</td>
      <td>{formatDecimal(metrics.recall)}</td>
      <td>{formatDecimal(metrics.f1)}</td>
    </>
  );
}

function OperatingPointTable({ point }: { point: BenchmarkOperatingPoint }) {
  return (
    <EnterpriseTable label={`${point.label} benchmark metrics`}>
      <thead>
        <tr>
          <th>Comparator</th>
          <th>True positive</th>
          <th>False positive</th>
          <th>True negative</th>
          <th>False negative</th>
          <th>Precision</th>
          <th>Recall</th>
          <th>F1</th>
        </tr>
      </thead>
      <tbody>
        {(Object.keys(methodNames) as (keyof typeof methodNames)[]).map((key) => (
          <tr key={key} data-benchmark-comparator={key}>
            <th scope="row">
              <strong>{methodNames[key]}</strong>
            </th>
            <MetricCells metrics={point[key]} />
          </tr>
        ))}
      </tbody>
    </EnterpriseTable>
  );
}

export function EvaluationPage() {
  const { session } = useAuth();
  const benchmark = useQuery({
    queryKey: ["benchmark", "summary"],
    queryFn: ({ signal }) => benchmarkApi.summary(session?.token ?? "", signal),
  });
  if (benchmark.isPending) return <LoadingSkeleton label="Loading benchmark evidence" />;
  if (benchmark.isError)
    return (
      <ErrorState
        message="The benchmark-v1 evidence report could not be loaded."
        onRetry={() => void benchmark.refetch()}
      />
    );
  const data = benchmark.data;
  const ordered = ["intervention_60", "escalation_40", "critical_80"];
  const interventionLimitation = data.limitations.find((limitation) =>
    limitation.toLowerCase().includes("underperforms isolated methods at 60+"),
  );
  return (
    <>
      <PageHeader
        eyebrow="Evidence report"
        title="Evaluation"
        description="What benchmark-v1 establishes, what it does not establish, and how each comparator behaves across three operating points."
        variant="report"
      />
      <div
        className="evaluation-disclaimer"
        data-benchmark-version={data.fixture_version}
      >
        <Badge value={data.fixture_version} tone="blue" />
        <div>
          <strong>{data.benchmark_name}</strong>
          <p>{data.disclaimer}</p>
        </div>
        <span>{data.total_cases} deterministic cases</span>
      </div>
      <div className="evaluation-verdict-grid">
        <section
          className="evaluation-verdict"
          aria-labelledby="evaluation-verdict-title"
        >
          <p className="panel-eyebrow">Bounded conclusion</p>
          <h2 id="evaluation-verdict-title">What has been demonstrated</h2>
          <blockquote>“{data.context_aware_scenario_statement}”</blockquote>
        </section>
        <aside className="calibration-warning">
          <span>Comparison boundary</span>
          <strong>The score scales are not identically calibrated.</strong>
          <p>
            Isolated comparators use rule-only scores. The fused comparator uses the
            hybrid contextual score, so threshold comparisons do not measure correlation
            alone.
          </p>
          {interventionLimitation !== undefined && (
            <p className="calibration-warning__result">{interventionLimitation}</p>
          )}
          <p className="calibration-warning__result">
            At 80+, neither isolated rule-only score reaches the threshold in this
            fixture. That operating point is structurally uninformative for those
            comparators and is not evidence of fused superiority.
          </p>
        </aside>
      </div>
      <Panel title="Known limitations" eyebrow="Retained without spin" variant="open">
        <ul className="limitations-list limitations-list--columns">
          {data.limitations
            .filter((limitation) => limitation !== interventionLimitation)
            .map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
        </ul>
      </Panel>
      <div className="operating-points">
        {ordered.map((key) => {
          const point = data.operating_points[key];
          if (point === undefined) return null;
          return (
            <Panel
              key={key}
              title={point.label}
              eyebrow={
                key === "intervention_60"
                  ? "Primary for operational holds"
                  : "Secondary operating point"
              }
              aside={<span className="threshold-chip">Score ≥ {point.threshold}</span>}
            >
              <p className="operating-definition">{point.positive_definition}</p>
              <p className="operating-calibration-note">
                Isolated rule scores and the fused hybrid contextual score are not
                calibrated identically.
              </p>
              <OperatingPointTable point={point} />
            </Panel>
          );
        })}
      </div>
      <Panel
        title="Comparator definitions"
        eyebrow="Read the methods before the metrics"
        variant="ledger"
      >
        <div className="definition-grid">
          {Object.entries(data.comparator_definitions).map(([name, definition]) => (
            <article key={name}>
              <strong>{methodNames[name as keyof typeof methodNames]}</strong>
              <p>{definition}</p>
              <code>{name}</code>
            </article>
          ))}
        </div>
        <dl className="metric-glossary">
          <div>
            <dt>True positive</dt>
            <dd>An attack correctly escalated at this threshold.</dd>
          </div>
          <div>
            <dt>False positive</dt>
            <dd>Legitimate activity incorrectly escalated.</dd>
          </div>
          <div>
            <dt>False negative</dt>
            <dd>An attack not escalated at this threshold.</dd>
          </div>
          <div>
            <dt>F1</dt>
            <dd>Balance of precision and recall when defined.</dd>
          </div>
        </dl>
      </Panel>
      <Panel title="Cohort breakdown" eyebrow="Case composition matters">
        <EnterpriseTable label="Benchmark cohort composition">
          <thead>
            <tr>
              <th>Cohort</th>
              <th>Cases</th>
              <th>Legitimate</th>
              <th>Attack</th>
              <th>60+ fused TP</th>
              <th>60+ fused FP</th>
              <th>60+ fused FN</th>
              <th>60+ fused F1</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.cohorts).map(([name, cohort]) => {
              const metrics =
                cohort.operating_points["intervention_60"]?.fused_hybrid_contextual_score;
              return (
                <tr key={name}>
                  <th scope="row">
                    <strong>{titleCase(name)}</strong>
                  </th>
                  <td>{cohort.case_count}</td>
                  <td>{cohort.label_distribution["legitimate"] ?? 0}</td>
                  <td>{cohort.label_distribution["attack"] ?? 0}</td>
                  <td>{metrics?.true_positives ?? "—"}</td>
                  <td>{metrics?.false_positives ?? "—"}</td>
                  <td>{metrics?.false_negatives ?? "—"}</td>
                  <td>{formatDecimal(metrics?.f1 ?? null)}</td>
                </tr>
              );
            })}
          </tbody>
        </EnterpriseTable>
      </Panel>
    </>
  );
}
