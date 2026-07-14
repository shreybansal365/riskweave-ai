import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { scenariosApi } from "../api/riskweave";
import { useAuth } from "../app/use-auth";
import {
  Button,
  ConfirmationDialog,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  RiskBadge,
  ScoreDisplay,
  StatusBadge,
} from "../components/ui";
import { useToast } from "../components/use-toast";
import { formatDecimal, titleCase } from "../lib/format";
import type { ScenarioExecution, ScenarioKey, ScenarioReset } from "../types/api";

export function SimulatorPage() {
  const { session } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const token = session?.token ?? "";
  const isAdmin = session?.user.role === "admin";
  const [results, setResults] = useState<Partial<Record<ScenarioKey, ScenarioExecution>>>(
    {},
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetResult, setResetResult] = useState<ScenarioReset | null>(null);
  const catalog = useQuery({
    queryKey: ["scenarios", "catalog"],
    queryFn: ({ signal }) => scenariosApi.catalog(token, signal),
  });
  const run = useMutation({
    mutationFn: (key: ScenarioKey) => scenariosApi.run(token, key),
    onSuccess: async (result) => {
      setResetResult(null);
      setResults((current) => ({ ...current, [result.scenario_key]: result }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["scenarios"] }),
        queryClient.invalidateQueries({ queryKey: ["incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      notify({
        tone: "success",
        title: result.idempotent
          ? "Scenario replayed idempotently"
          : "Scenario completed",
        message: `${titleCase(result.scenario_key)} produced a ${titleCase(result.severity)} decision with fused score ${result.fused_score.toString()}.`,
      });
    },
    onError: (error) => {
      notify({
        tone: "danger",
        title: "Scenario did not complete",
        message:
          error instanceof Error ? error.message : "The service rejected this scenario.",
      });
    },
  });
  const reset = useMutation({
    mutationFn: () => scenariosApi.reset(token),
    onSuccess: async (result) => {
      setResults({});
      setResetResult(result);
      setConfirmReset(false);
      await queryClient.invalidateQueries();
      notify({
        tone: result.exact_baseline_restored ? "success" : "danger",
        title: result.exact_baseline_restored
          ? "Exact baseline restored"
          : "Reset requires attention",
        message: `${result.dataset_version} restored in ${result.elapsed_seconds.toFixed(3)} seconds.`,
      });
    },
    onError: (error) => {
      notify({
        tone: "danger",
        title: "Reset failed",
        message: error instanceof Error ? error.message : "The baseline was not reset.",
      });
    },
  });

  if (catalog.isPending)
    return <LoadingSkeleton label="Loading deterministic scenarios" />;
  if (catalog.isError)
    return (
      <ErrorState
        message="The scenario catalog could not be loaded."
        onRetry={() => void catalog.refetch()}
      />
    );

  return (
    <>
      <PageHeader
        eyebrow="Controlled demonstration"
        title="Scenario simulator"
        description="Compare a normal payment, an isolated cyber anomaly, and a correlated account takeover through the same deterministic services."
        variant="stage"
        actions={
          isAdmin ? (
            <Button
              tone="secondary"
              type="button"
              aria-label="Restore exact baseline"
              onClick={() => {
                setConfirmReset(true);
              }}
            >
              Reset demonstration data
            </Button>
          ) : undefined
        }
      />
      {!isAdmin && (
        <div className="permission-notice">
          <strong>Read-only analyst view.</strong> Scenario execution and reset are
          administrator-only operations enforced by the API.
        </div>
      )}
      <p className="synthetic-notice">{catalog.data.synthetic_data_notice}</p>
      {resetResult !== null && (
        <div
          className={`reset-result${resetResult.exact_baseline_restored ? " reset-result--verified" : " reset-result--attention"}`}
          role="status"
        >
          <span>
            {resetResult.exact_baseline_restored
              ? "Baseline verified"
              : "Reset needs attention"}
          </span>
          <strong>{resetResult.dataset_version}</strong>
          <p>
            {resetResult.exact_baseline_restored
              ? "The deterministic manifest was restored exactly."
              : "The API did not verify exact baseline restoration."}
            <br />
            Fingerprint: <code>{resetResult.fingerprint}</code>
            <span aria-hidden="true"> · </span>
            Baseline incidents: {resetResult.counts["incidents"] ?? 0}
            <span aria-hidden="true"> · </span>
            {resetResult.elapsed_seconds.toFixed(3)} seconds.
          </p>
        </div>
      )}
      <ol
        className="scenario-stage scenario-grid"
        aria-label="Deterministic scenario progression"
      >
        {catalog.data.items.map((scenario, index) => {
          const result = results[scenario.scenario_key];
          const authoritative = result ?? scenario.expected_outcome;
          const isRunning = run.isPending && run.variables === scenario.scenario_key;
          return (
            <li className="scenario-step" key={scenario.scenario_key}>
              <article
                className={`scenario-card scenario-card--${scenario.scenario_key}`}
                data-scenario-key={scenario.scenario_key}
                aria-busy={isRunning}
              >
                <header>
                  <span className="scenario-index">Journey 0{index + 1}</span>
                  <div>
                    <p>{titleCase(scenario.status)}</p>
                    <h2>{scenario.title}</h2>
                  </div>
                  <RiskBadge severity={authoritative.severity} />
                </header>
                <p className="scenario-purpose">{scenario.purpose}</p>
                <section className="scenario-evidence" aria-label="Important evidence">
                  <h3>Important evidence</h3>
                  <ul className="signal-list">
                    {scenario.important_signals.map((signal) => (
                      <li key={signal}>{signal}</li>
                    ))}
                  </ul>
                </section>
                <div className="scenario-decision-ledger">
                  <div className="scenario-stream-scores">
                    <ScoreDisplay
                      label="Cyber"
                      score={authoritative.cyber_score}
                      accent="cyber"
                    />
                    <ScoreDisplay
                      label="Transaction"
                      score={authoritative.transaction_score}
                      accent="transaction"
                    />
                    <ScoreDisplay
                      label="Eligible bonus"
                      score={authoritative.correlation_bonus}
                      accent="bonus"
                    />
                  </div>
                  <ScoreDisplay
                    label="Authoritative fused decision"
                    score={authoritative.fused_score}
                    detail={`Raw ${formatDecimal(authoritative.raw_fused_score)}`}
                    accent="fused"
                  />
                </div>
                <div className="expected-outcome">
                  <span>
                    <small>Backend decision</small>
                    <strong>{titleCase(authoritative.recommended_action)}</strong>
                  </span>
                  <StatusBadge status={authoritative.transaction_status} />
                </div>
                {result !== undefined && (
                  <div className="scenario-result" role="status">
                    <span>
                      {result.idempotent
                        ? "Existing deterministic result reused"
                        : "New deterministic incident persisted"}
                    </span>
                    <Link to={`/incidents/${result.incident_id}`}>
                      Open investigation →
                    </Link>
                  </div>
                )}
                {result === undefined && scenario.result_incident_id !== null && (
                  <div className="scenario-result">
                    <span>Completed result available</span>
                    <Link to={`/incidents/${scenario.result_incident_id}`}>
                      Open investigation →
                    </Link>
                  </div>
                )}
                <Button
                  tone="primary"
                  type="button"
                  aria-label={
                    scenario.status === "completed"
                      ? "Replay idempotently"
                      : "Run scenario"
                  }
                  disabled={!isAdmin || run.isPending}
                  onClick={() => {
                    run.mutate(scenario.scenario_key);
                  }}
                >
                  {isRunning
                    ? "Executing…"
                    : scenario.status === "completed"
                      ? "Replay same scenario"
                      : "Run scenario"}
                </Button>
              </article>
            </li>
          );
        })}
      </ol>
      <ConfirmationDialog
        open={confirmReset}
        title="Restore the exact baseline dataset?"
        description="This atomic administrator operation removes showcase scenario records and restores the deterministic 14-day baseline manifest."
        confirmLabel="Restore baseline"
        danger
        busy={reset.isPending}
        onClose={() => {
          setConfirmReset(false);
        }}
        onConfirm={() => {
          reset.mutate();
        }}
      />
    </>
  );
}
