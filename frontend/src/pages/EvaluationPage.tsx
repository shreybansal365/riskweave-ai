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
          <th>TP</th>
          <th>FP</th>
          <th>TN</th>
          <th>FN</th>
          <th>Precision</th>
          <th>Recall</th>
          <th>F1</th>
        </tr>
      </thead>
      <tbody>
        {(Object.keys(methodNames) as (keyof typeof methodNames)[]).map((key) => (
          <tr key={key}>
            <td>
              <strong>{methodNames[key]}</strong>
            </td>
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
  const ordered = ["escalation_40", "intervention_60", "critical_80"];
  return (
    <>
      <PageHeader
        eyebrow="Transparent prototype evidence"
        title="Evaluation"
        description="A qualified view of benchmark-v1 across three operating points, with unfavorable results and scope limitations retained."
      />
      <div className="evaluation-disclaimer">
        <Badge value={data.fixture_version} tone="blue" />
        <div>
          <strong>{data.benchmark_name}</strong>
          <p>{data.disclaimer}</p>
        </div>
        <span>{data.total_cases} deterministic cases</span>
      </div>
      <Panel
        title="Comparator definitions"
        eyebrow="Not identically calibrated score scales"
      >
        <div className="definition-grid">
          {Object.entries(data.comparator_definitions).map(([name, definition]) => (
            <article key={name}>
              <code>{name}</code>
              <strong>{methodNames[name as keyof typeof methodNames]}</strong>
              <p>{definition}</p>
            </article>
          ))}
        </div>
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
              <OperatingPointTable point={point} />
            </Panel>
          );
        })}
      </div>
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
                  <td>
                    <strong>{titleCase(name)}</strong>
                  </td>
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
      <div className="evidence-grid">
        <Panel title="What has been demonstrated" eyebrow="Bounded conclusion">
          <blockquote>“{data.context_aware_scenario_statement}”</blockquote>
        </Panel>
        <Panel title="Known limitations" eyebrow="Retained without spin">
          <ul className="limitations-list">
            {data.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
