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
import type { ScenarioExecution, ScenarioKey } from "../types/api";

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
  const catalog = useQuery({
    queryKey: ["scenarios", "catalog"],
    queryFn: ({ signal }) => scenariosApi.catalog(token, signal),
  });
  const run = useMutation({
    mutationFn: (key: ScenarioKey) => scenariosApi.run(token, key),
    onSuccess: async (result) => {
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
        eyebrow="Deterministic demonstration"
        title="Scenario simulator"
        description="Replay three fixed synthetic journeys against the same backend intelligence services used by persisted incidents."
        actions={
          isAdmin ? (
            <Button
              tone="danger"
              type="button"
              onClick={() => {
                setConfirmReset(true);
              }}
            >
              Restore exact baseline
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
      <div className="scenario-grid">
        {catalog.data.items.map((scenario, index) => {
          const result = results[scenario.scenario_key];
          const authoritative = result ?? scenario.expected_outcome;
          return (
            <article
              className={`scenario-card scenario-card--${scenario.scenario_key}`}
              key={scenario.scenario_key}
            >
              <header>
                <span className="scenario-index">0{index + 1}</span>
                <div>
                  <p>{titleCase(scenario.status)}</p>
                  <h2>{scenario.title}</h2>
                </div>
                <RiskBadge severity={authoritative.severity} />
              </header>
              <p className="scenario-purpose">{scenario.purpose}</p>
              <ul className="signal-list">
                {scenario.important_signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
              <div className="scenario-scores">
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
                  label="Bonus"
                  score={authoritative.correlation_bonus}
                  accent="bonus"
                />
                <ScoreDisplay
                  label="Fused"
                  score={authoritative.fused_score}
                  detail={`Raw ${formatDecimal(authoritative.raw_fused_score)}`}
                  accent="fused"
                />
              </div>
              <div className="expected-outcome">
                <span>
                  <small>Expected action</small>
                  <strong>{titleCase(authoritative.recommended_action)}</strong>
                </span>
                <StatusBadge status={authoritative.transaction_status} />
              </div>
              {result !== undefined && (
                <div className="scenario-result">
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
                disabled={!isAdmin || run.isPending}
                onClick={() => {
                  run.mutate(scenario.scenario_key);
                }}
              >
                {run.isPending && run.variables === scenario.scenario_key
                  ? "Executing…"
                  : scenario.status === "completed"
                    ? "Replay idempotently"
                    : "Run scenario"}
              </Button>
            </article>
          );
        })}
      </div>
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
