import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type SyntheticEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { incidentsApi } from "../api/riskweave";
import { useAuth } from "../app/use-auth";
import { ContributionList, IncidentTimeline } from "../components/incident-components";
import {
  Badge,
  Button,
  ConfirmationDialog,
  ErrorState,
  LoadingSkeleton,
  Panel,
  RiskBadge,
  ScoreDisplay,
  StatusBadge,
} from "../components/ui";
import { useToast } from "../components/use-toast";
import { ApiError } from "../lib/api-client";
import { formatDateTime, formatDecimal, formatMoney, titleCase } from "../lib/format";
import type { AnalystActionType, IncidentStatus } from "../types/api";

const actionLabels: Record<AnalystActionType, string> = {
  add_note: "Add analyst note",
  start_review: "Mark in review",
  mark_confirmed_fraud: "Confirm fraud",
  mark_legitimate: "Mark legitimate",
  simulate_hold: "Simulate transaction hold",
  simulate_release: "Simulate release",
  simulate_decline: "Simulate decline",
  close_incident: "Close case",
};

const patchTargets: Partial<Record<AnalystActionType, IncidentStatus>> = {
  start_review: "in_review",
  mark_confirmed_fraud: "confirmed_fraud",
  mark_legitimate: "legitimate",
  close_incident: "closed",
};

const consequential = new Set<AnalystActionType>([
  "mark_confirmed_fraud",
  "mark_legitimate",
  "close_incident",
  "simulate_hold",
  "simulate_release",
  "simulate_decline",
]);

export function IncidentDetailPage() {
  const { incidentId = "" } = useParams();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const token = session?.token ?? "";
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<AnalystActionType | null>(null);
  const incident = useQuery({
    queryKey: ["incidents", "detail", incidentId],
    queryFn: ({ signal }) => incidentsApi.detail(token, incidentId, signal),
    enabled: incidentId !== "",
  });
  const customer = useQuery({
    queryKey: ["customers", incident.data?.customer.customer_id],
    queryFn: ({ signal }) =>
      incidentsApi.customer(token, incident.data?.customer.customer_id ?? "", signal),
    enabled: incident.data !== undefined,
  });

  const mutation = useMutation({
    mutationFn: async ({
      action,
      submittedNote,
    }: {
      action: AnalystActionType;
      submittedNote: string | null;
    }) => {
      if (incident.data === undefined) throw new Error("Incident is not loaded");
      const target = patchTargets[action];
      if (target !== undefined) {
        return incidentsApi.patch(
          token,
          incidentId,
          target,
          submittedNote,
          incident.data.updated_at,
        );
      }
      return incidentsApi.action(
        token,
        incidentId,
        action,
        submittedNote,
        incident.data.updated_at,
      );
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
      ]);
      setNote("");
      setPendingAction(null);
      notify({
        tone: "success",
        title: result.idempotent_replay ? "Action already recorded" : "Case updated",
        message: `Incident is now ${titleCase(result.status)}; transaction is ${titleCase(result.transaction_status)}.`,
      });
    },
    onError: async (error) => {
      const conflict = error instanceof ApiError && error.status === 409;
      if (conflict)
        await queryClient.invalidateQueries({
          queryKey: ["incidents", "detail", incidentId],
        });
      notify({
        tone: "danger",
        title: conflict ? "Case changed before this action" : "Action was not recorded",
        message:
          error instanceof Error ? error.message : "The service rejected this action.",
      });
      setPendingAction(null);
    },
  });

  if (incident.isPending)
    return <LoadingSkeleton label="Loading investigation workspace" />;
  if (incident.isError) {
    const notFound = incident.error instanceof ApiError && incident.error.status === 404;
    return notFound ? (
      <ErrorState
        title="Incident not found"
        message="The requested incident does not exist in the current deterministic dataset."
        onRetry={() => void incident.refetch()}
      />
    ) : (
      <ErrorState
        message="The investigation workspace could not retrieve this case."
        onRetry={() => void incident.refetch()}
      />
    );
  }

  const data = incident.data;
  const returnQuery = params.get("return");
  const returnPath = `/incidents${returnQuery === null ? "" : `?${returnQuery}`}`;
  const runAction = (action: AnalystActionType, submittedNote: string | null = null) => {
    if (consequential.has(action)) setPendingAction(action);
    else mutation.mutate({ action, submittedNote });
  };
  const submitNote = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = note.trim();
    if (normalized !== "")
      mutation.mutate({ action: "add_note", submittedNote: normalized });
  };

  return (
    <>
      <div className="case-breadcrumb">
        <Link to={returnPath}>← Back to incident queue</Link>
      </div>
      <header className="case-header">
        <div>
          <p className="eyebrow">Incident investigation</p>
          <div className="case-title-line">
            <h1>{data.incident_reference}</h1>
            <RiskBadge severity={data.severity} />
            <StatusBadge status={data.status} />
          </div>
          <p>{data.summary}</p>
          <div className="case-meta">
            <span>Observed {formatDateTime(data.created_at)}</span>
            <span>{data.customer.customer_reference}</span>
            <span>{data.account.account_reference}</span>
            {data.scenario_key !== null && (
              <Badge value={data.scenario_key} tone="blue" />
            )}
          </div>
        </div>
        <div className="case-decision">
          <span>Authoritative fused score</span>
          <strong>{data.fused_score}</strong>
          <em>{titleCase(data.recommended_action)}</em>
          <StatusBadge status={data.transaction.status} />
        </div>
      </header>

      <section className="convergence-panel" aria-labelledby="convergence-title">
        <header>
          <div>
            <p className="panel-eyebrow">Signal convergence</p>
            <h2 id="convergence-title">Why separate signals became one decision</h2>
          </div>
          <span>
            {data.engine_version} · {data.model_version}
          </span>
        </header>
        <div className="convergence-streams">
          <ScoreDisplay
            label="Cyber stream"
            score={data.cyber_score}
            detail="Backend-owned score"
            accent="cyber"
          />
          <span className="convergence-operator" aria-hidden="true">
            +
          </span>
          <ScoreDisplay
            label="Transaction stream"
            score={data.transaction_score}
            detail="Backend-owned score"
            accent="transaction"
          />
          <span className="convergence-operator" aria-hidden="true">
            +
          </span>
          <ScoreDisplay
            label="Interaction bonus"
            score={data.correlation_bonus}
            detail="Verified cross-domain rules"
            accent="bonus"
          />
          <span className="convergence-arrow" aria-hidden="true">
            →
          </span>
          <ScoreDisplay
            label="Fused decision"
            score={data.fused_score}
            detail={`Raw ${formatDecimal(data.raw_fused_score)} · rounded once`}
            accent="fused"
          />
        </div>
        <div className="decision-copy">
          <p>
            <strong>Decision.</strong> {data.decision_explanation}
          </p>
          <p>
            <strong>Recommended response.</strong> {data.action_explanation}
          </p>
        </div>
      </section>

      <div className="investigation-layout">
        <Panel
          title="Chronological evidence"
          eyebrow="Persisted incident timeline"
          className="timeline-panel"
        >
          <IncidentTimeline items={data.timeline} />
        </Panel>
        <aside className="case-sidebar">
          <Panel title="Case controls" eyebrow="Valid server-approved actions">
            <div className="action-panel">
              {data.available_actions
                .filter((action) => action !== "add_note")
                .map((action) => (
                  <Button
                    key={action}
                    type="button"
                    tone={
                      action === "mark_confirmed_fraud" || action === "simulate_decline"
                        ? "danger"
                        : action === "start_review"
                          ? "primary"
                          : "secondary"
                    }
                    disabled={mutation.isPending}
                    onClick={() => {
                      runAction(action);
                    }}
                  >
                    {actionLabels[action]}
                  </Button>
                ))}
              {data.available_actions.filter((action) => action !== "add_note").length ===
                0 && (
                <p className="quiet-copy">No state-changing action is currently valid.</p>
              )}
              {data.available_actions.includes("add_note") && (
                <form className="note-form" onSubmit={submitNote}>
                  <label htmlFor="analyst-note">Analyst note</label>
                  <textarea
                    id="analyst-note"
                    maxLength={2000}
                    value={note}
                    onChange={(event) => {
                      setNote(event.target.value);
                    }}
                    placeholder="Record investigation context without sensitive personal data."
                  />
                  <div>
                    <span>{note.length}/2000</span>
                    <Button
                      type="submit"
                      disabled={mutation.isPending || note.trim() === ""}
                    >
                      Add note
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Panel>
          <Panel title="Transaction context" eyebrow="Persisted payment state">
            <dl className="detail-list">
              <div>
                <dt>Amount</dt>
                <dd>{formatMoney(data.transaction.amount_minor)}</dd>
              </div>
              <div>
                <dt>Beneficiary</dt>
                <dd>{data.transaction.beneficiary_display_name}</dd>
              </div>
              <div>
                <dt>Destination</dt>
                <dd>{titleCase(data.transaction.destination_risk)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={data.transaction.status} />
                </dd>
              </div>
            </dl>
          </Panel>
        </aside>
      </div>

      <Panel title="Contribution analysis" eyebrow="Grounded and inspectable">
        <div className="contribution-grid">
          <ContributionList
            title="Cyber evidence"
            items={data.cyber_contributions}
            stream="cyber"
          />
          <ContributionList
            title="Transaction evidence"
            items={data.transaction_contributions}
            stream="transaction"
          />
          <ContributionList
            title="Cross-domain interactions"
            items={data.interaction_contributions}
            stream="interaction"
          />
        </div>
      </Panel>

      <div className="context-grid">
        <Panel title="Customer and account baseline" eyebrow="Bounded synthetic context">
          {customer.isPending ? (
            <LoadingSkeleton label="Loading customer context" />
          ) : customer.isError ? (
            <ErrorState
              message="Customer context is temporarily unavailable."
              onRetry={() => void customer.refetch()}
            />
          ) : (
            <div className="customer-context">
              <div className="identity-strip">
                <span>
                  <small>Customer</small>
                  <strong>{customer.data.display_name}</strong>
                </span>
                <span>
                  <small>Home context</small>
                  <strong>
                    {customer.data.home_city}, {customer.data.home_country}
                  </strong>
                </span>
                <span>
                  <small>Risk segment</small>
                  <strong>{titleCase(customer.data.risk_segment)}</strong>
                </span>
              </div>
              <dl className="baseline-grid">
                <div>
                  <dt>Normal transaction median</dt>
                  <dd>
                    {formatMoney(
                      customer.data.behavioural_baseline.normal_transaction_median_minor,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Typical login hours</dt>
                  <dd>
                    {customer.data.behavioural_baseline.typical_login_start_hour}:00–
                    {customer.data.behavioural_baseline.typical_login_end_hour}:00 UTC
                  </dd>
                </div>
                <div>
                  <dt>Usual locations</dt>
                  <dd>{customer.data.familiar_locations.join(", ")}</dd>
                </div>
                <div>
                  <dt>Known channels</dt>
                  <dd>
                    {customer.data.behavioural_baseline.known_channels
                      .map(titleCase)
                      .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>Trusted devices</dt>
                  <dd>{customer.data.trusted_devices.length}</dd>
                </div>
                <div>
                  <dt>Typical 30m velocity</dt>
                  <dd>
                    {formatDecimal(
                      customer.data.behavioural_baseline.typical_transaction_velocity_30m,
                    )}
                  </dd>
                </div>
              </dl>
              <div className="context-columns">
                <section>
                  <h3>Trusted devices</h3>
                  {customer.data.trusted_devices.slice(0, 4).map((device) => (
                    <p key={device.device_id}>
                      <strong>{device.device_reference}</strong>
                      <span>
                        {device.operating_system} · {titleCase(device.posture)}
                      </span>
                    </p>
                  ))}
                </section>
                <section>
                  <h3>Familiar beneficiaries</h3>
                  {customer.data.recent_beneficiaries.slice(0, 4).map((beneficiary) => (
                    <p key={beneficiary.beneficiary_id}>
                      <strong>{beneficiary.display_name}</strong>
                      <span>{titleCase(beneficiary.risk_level)}</span>
                    </p>
                  ))}
                </section>
                <section>
                  <h3>Recent transactions</h3>
                  {customer.data.recent_transactions.slice(0, 4).map((transaction) => (
                    <p key={transaction.transaction_id}>
                      <strong>{formatMoney(transaction.amount_minor)}</strong>
                      <span>
                        {formatDateTime(transaction.created_at)} ·{" "}
                        {titleCase(transaction.status)}
                      </span>
                    </p>
                  ))}
                </section>
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Channel crypto readiness" eyebrow="Separate from fraud risk">
          <div className="quantum-context-card">
            <div>
              <span>{data.crypto_readiness.channel_display_name}</span>
              <strong>{data.crypto_readiness.asset_name}</strong>
            </div>
            <ScoreDisplay
              label="Migration priority"
              score={data.crypto_readiness.priority_score}
              detail={titleCase(data.crypto_readiness.priority_level)}
              accent="neutral"
            />
            <dl className="detail-list">
              <div>
                <dt>PQC readiness</dt>
                <dd>{data.crypto_readiness.pqc_ready ? "Ready" : "Not ready"}</dd>
              </div>
              <div>
                <dt>Migration status</dt>
                <dd>{titleCase(data.crypto_readiness.migration_status)}</dd>
              </div>
            </dl>
            <ul>
              {data.crypto_readiness.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <p className="separation-notice">
              {data.crypto_readiness.fraud_risk_separation_notice}
            </p>
          </div>
        </Panel>
      </div>

      <Panel title="Analyst history" eyebrow="Append-oriented workflow evidence">
        {data.analyst_actions.length === 0 ? (
          <p className="quiet-copy">
            No analyst action has been recorded for this incident.
          </p>
        ) : (
          <div className="history-list">
            {data.analyst_actions.map((action) => (
              <article key={action.analyst_action_id}>
                <span>{formatDateTime(action.created_at)}</span>
                <div>
                  <strong>{actionLabels[action.action_type]}</strong>
                  <small>
                    {action.analyst_display_name} ·{" "}
                    {titleCase(action.previous_incident_status)} →{" "}
                    {titleCase(action.new_incident_status)}
                  </small>
                  {action.note !== null && <p>{action.note}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <ConfirmationDialog
        open={pendingAction !== null}
        title={pendingAction === null ? "Confirm action" : actionLabels[pendingAction]}
        description="This action changes the persisted synthetic case or transaction state and will create an append-oriented audit record."
        confirmLabel={pendingAction === null ? "Confirm" : actionLabels[pendingAction]}
        danger={
          pendingAction === "mark_confirmed_fraud" || pendingAction === "simulate_decline"
        }
        busy={mutation.isPending}
        onClose={() => {
          setPendingAction(null);
        }}
        onConfirm={() => {
          if (pendingAction !== null)
            mutation.mutate({ action: pendingAction, submittedNote: null });
        }}
      />
    </>
  );
}
