import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import {
  Link,
  useBeforeUnload,
  useBlocker,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { incidentsApi } from "../api/riskweave";
import { useAuth } from "../app/use-auth";
import { DecisionWeave } from "../components/DecisionWeave";
import {
  ContributionList,
  DecisiveEvidence,
  IncidentTimeline,
} from "../components/incident-components";
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
import { ApiError } from "../lib/api-client";
import {
  formatDateTime,
  formatDecimal,
  formatMoney,
  shortIdentifier,
  titleCase,
} from "../lib/format";
import type { AnalystActionType, IncidentStatus, RecommendedAction } from "../types/api";

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

const recommendedActionLabels: Record<RecommendedAction, string> = {
  allow: "Allow",
  allow_and_monitor: "Allow and monitor",
  step_up_authentication: "Step-up verification",
  hold_for_review: "Hold for analyst review",
  hold_and_open_critical_incident: "Hold transaction and open critical incident",
};

const dispositionActionTypes = new Set<AnalystActionType>([
  "start_review",
  "mark_confirmed_fraud",
  "mark_legitimate",
  "close_incident",
]);

const transactionActionTypes = new Set<AnalystActionType>([
  "simulate_hold",
  "simulate_release",
  "simulate_decline",
]);

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
  const queryClient = useQueryClient();
  const token = session?.token ?? "";
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<AnalystActionType | null>(null);
  const [workflowFeedback, setWorkflowFeedback] = useState<{
    tone: "success" | "danger";
    title: string;
    message: string;
  } | null>(null);
  const workflowFeedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (workflowFeedback !== null) workflowFeedbackRef.current?.focus();
  }, [workflowFeedback]);
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
    onSuccess: async (result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
      ]);
      if (variables.action === "add_note") setNote("");
      setPendingAction(null);
      const feedback = {
        tone: "success" as const,
        title: result.idempotent_replay ? "Action already recorded" : "Case updated",
        message: `Incident is now ${titleCase(result.status)}; transaction is ${titleCase(result.transaction_status)}.`,
      };
      setWorkflowFeedback(feedback);
    },
    onError: async (error) => {
      const conflict = error instanceof ApiError && error.status === 409;
      if (conflict)
        await queryClient.invalidateQueries({
          queryKey: ["incidents", "detail", incidentId],
        });
      const feedback = {
        tone: "danger" as const,
        title: conflict ? "Case changed before this action" : "Action was not recorded",
        message:
          error instanceof Error ? error.message : "The service rejected this action.",
      };
      setWorkflowFeedback(feedback);
      setPendingAction(null);
    },
  });

  const hasUnsavedNote = note.trim() !== "";
  const shouldBlockNavigation = useCallback(
    ({
      currentLocation,
      nextLocation,
    }: {
      currentLocation: { pathname: string; search: string };
      nextLocation: { pathname: string; search: string };
    }) =>
      session !== null &&
      hasUnsavedNote &&
      `${currentLocation.pathname}${currentLocation.search}` !==
        `${nextLocation.pathname}${nextLocation.search}`,
    [hasUnsavedNote, session],
  );
  const noteNavigationBlocker = useBlocker(shouldBlockNavigation);
  useBeforeUnload(
    useCallback(
      (event) => {
        if (!hasUnsavedNote) return;
        event.preventDefault();
        Reflect.set(event, "returnValue", "");
      },
      [hasUnsavedNote],
    ),
    { capture: true },
  );

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
  const isLegitimateNewDevice = data.scenario_key === "legitimate_new_device";
  const treatmentLabel = recommendedActionLabels[data.recommended_action];
  const dispositionActions = data.available_actions.filter((action) =>
    dispositionActionTypes.has(action),
  );
  const transactionActions = data.available_actions.filter((action) =>
    transactionActionTypes.has(action),
  );
  const alignedDispositionAction = isLegitimateNewDevice
    ? dispositionActions.find((action) => action === "mark_legitimate")
    : dispositionActions.find((action) => action === "start_review");
  const otherDispositionActions = dispositionActions.filter(
    (action) => action !== alignedDispositionAction,
  );
  const actionTone = (action: AnalystActionType) => {
    if (action === alignedDispositionAction) return "primary" as const;
    if (
      !isLegitimateNewDevice &&
      (action === "mark_confirmed_fraud" ||
        action === "simulate_hold" ||
        action === "simulate_decline")
    )
      return "danger" as const;
    return "secondary" as const;
  };
  const actionButton = (action: AnalystActionType) => (
    <Button
      key={action}
      type="button"
      tone={actionTone(action)}
      disabled={mutation.isPending}
      onClick={() => {
        runAction(action);
      }}
    >
      {actionLabels[action]}
    </Button>
  );

  return (
    <>
      <div className="case-breadcrumb">
        <Link to={returnPath}>← Back to incident queue</Link>
      </div>
      <header className="case-header" data-incident-id={data.incident_id}>
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
          <span>Fused risk</span>
          <strong className="case-decision__score">
            {data.fused_score}
            <small> / 100</small>
          </strong>
          <em className="case-decision__treatment">{treatmentLabel}</em>
          <div className="case-decision__states">
            <RiskBadge severity={data.severity} />
            <StatusBadge status={data.transaction.status} />
          </div>
        </div>
      </header>

      {workflowFeedback !== null && (
        <div
          className={`state-message workflow-feedback${
            workflowFeedback.tone === "danger" ? " state-message--error" : ""
          }`}
          role={workflowFeedback.tone === "danger" ? "alert" : "status"}
          aria-live={workflowFeedback.tone === "danger" ? "assertive" : "polite"}
          tabIndex={-1}
          ref={workflowFeedbackRef}
          data-workflow-feedback
        >
          <strong>{workflowFeedback.title}</strong>
          <p>{workflowFeedback.message}</p>
        </div>
      )}

      <section
        className="decision-context"
        aria-labelledby="decision-context-title"
        data-decision-context
      >
        <header className="decision-context__header">
          <div>
            <p className="panel-eyebrow">Decision context</p>
            <h2 id="decision-context-title">
              {formatMoney(data.transaction.amount_minor)} transfer{" "}
              {titleCase(data.transaction.status)}
            </h2>
          </div>
          <p>{data.action_explanation}</p>
        </header>
        <dl className="decision-context__ledger">
          <div className="decision-context__primary">
            <dt>Transfer amount</dt>
            <dd>{formatMoney(data.transaction.amount_minor)}</dd>
          </div>
          <div>
            <dt>Beneficiary</dt>
            <dd>{data.transaction.beneficiary_display_name}</dd>
          </div>
          <div>
            <dt>Payment channel</dt>
            <dd>{data.crypto_readiness.channel_display_name}</dd>
          </div>
          <div>
            <dt>Destination risk</dt>
            <dd>{titleCase(data.transaction.destination_risk)}</dd>
          </div>
          <div>
            <dt>Transaction state</dt>
            <dd>
              <StatusBadge status={data.transaction.status} />
            </dd>
          </div>
          <div>
            <dt>Customer</dt>
            <dd>{data.customer.customer_reference}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{data.account.account_reference}</dd>
          </div>
          <div>
            <dt>Session origin</dt>
            <dd>
              {data.session.city}, {data.session.country} ·{" "}
              {data.session.masked_ip_address}
            </dd>
          </div>
          <div>
            <dt>Session</dt>
            <dd>{shortIdentifier(data.session.session_id)}</dd>
          </div>
        </dl>
      </section>

      {isLegitimateNewDevice && (
        <section
          className="intervention-avoided"
          aria-labelledby="intervention-avoided-title"
          data-scenario-treatment="allow_and_monitor"
        >
          <header>
            <div>
              <p className="panel-eyebrow">Proportionate decision</p>
              <h2 id="intervention-avoided-title">Why intervention was avoided</h2>
            </div>
            <strong>Current treatment: {treatmentLabel}</strong>
          </header>
          <div className="intervention-avoided__evidence">
            <section>
              <span>Unusual cyber context</span>
              <strong>Cyber score {data.cyber_score}</strong>
              <ul>
                {data.cyber_contributions.slice(0, 4).map((item) => (
                  <li key={item.contribution_id}>{item.explanation}</li>
                ))}
              </ul>
            </section>
            <section>
              <span>Transaction context</span>
              <strong>Transaction score {data.transaction_score}</strong>
              {data.transaction_contributions.length === 0 ? (
                <p>No persisted transaction contribution raised this stream.</p>
              ) : (
                <ul>
                  {data.transaction_contributions.slice(0, 4).map((item) => (
                    <li key={item.contribution_id}>{item.explanation}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <div className="intervention-avoided__outcome" role="status">
            <span>Interaction bonus {data.correlation_bonus}</span>
            <span>Transaction {titleCase(data.transaction.status)} · no hold</span>
            <span>No step-up authentication</span>
          </div>
          <p>{data.decision_explanation}</p>
        </section>
      )}

      <DecisionWeave
        cyberScore={data.cyber_score}
        transactionScore={data.transaction_score}
        correlationBonus={data.correlation_bonus}
        rawFusedScore={data.raw_fused_score}
        fusedScore={data.fused_score}
        severity={data.severity}
        recommendedActionLabel={treatmentLabel}
        transactionStatus={data.transaction.status}
        decisionExplanation={data.decision_explanation}
        cyberEvidence={data.cyber_contributions}
        transactionEvidence={data.transaction_contributions}
        interactions={data.interaction_contributions}
        fusionProjection={data.fusion_projection}
      />

      <Panel
        title="Decisive evidence"
        eyebrow="Highest-impact persisted contributions"
        className="decisive-evidence-panel"
      >
        <DecisiveEvidence
          cyber={data.cyber_contributions}
          transaction={data.transaction_contributions}
          interactions={data.interaction_contributions}
        />
      </Panel>

      <div className="investigation-layout">
        <Panel
          title="Chronological evidence"
          eyebrow="Complete persisted evidence trail"
          className="timeline-panel"
        >
          <IncidentTimeline items={data.timeline} />
        </Panel>
        <aside className="case-sidebar investigation-action-rail">
          <Panel
            title="Investigation disposition"
            eyebrow="Valid server-approved case actions"
            className="disposition-panel"
          >
            <p className="current-treatment" role="status">
              <span>Current treatment</span>
              <strong>{treatmentLabel}</strong>
            </p>
            <div className="action-panel">
              {alignedDispositionAction !== undefined &&
                actionButton(alignedDispositionAction)}
              {!isLegitimateNewDevice && otherDispositionActions.map(actionButton)}
              {isLegitimateNewDevice && otherDispositionActions.length > 0 && (
                <details className="server-approved-actions">
                  <summary>Other server-approved actions</summary>
                  <div>{otherDispositionActions.map(actionButton)}</div>
                </details>
              )}
              {dispositionActions.length === 0 && (
                <p className="quiet-copy">No disposition change is currently valid.</p>
              )}
            </div>
          </Panel>
          <Panel
            title="Synthetic transaction response"
            eyebrow="Validated payment-state simulation"
            className="transaction-response-panel"
          >
            <div className="transaction-response-state">
              <span>Current synthetic state</span>
              <StatusBadge status={data.transaction.status} />
            </div>
            <div className="action-panel">
              {transactionActions.map(actionButton)}
              {transactionActions.length === 0 && (
                <p className="quiet-copy">
                  No simulated transaction response is currently valid.
                </p>
              )}
            </div>
          </Panel>
          <Panel
            title="Analyst note"
            eyebrow="Append-oriented investigation context"
            className="analyst-note-panel"
          >
            {data.available_actions.includes("add_note") ? (
              <form className="note-form" onSubmit={submitNote}>
                <label htmlFor="analyst-note">Case note</label>
                <textarea
                  id="analyst-note"
                  maxLength={2000}
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                  }}
                  placeholder="Record investigation context without sensitive personal data."
                />
                {hasUnsavedNote && (
                  <div className="note-draft-warning" role="status">
                    <span>Unsaved note. Save it or discard it before leaving.</span>
                    <Button
                      type="button"
                      tone="quiet"
                      disabled={mutation.isPending}
                      onClick={() => {
                        setNote("");
                      }}
                    >
                      Discard draft
                    </Button>
                  </div>
                )}
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
            ) : (
              <p className="quiet-copy">Notes are not available for this case state.</p>
            )}
          </Panel>
        </aside>
      </div>

      <Panel
        title="Complete contribution ledger"
        eyebrow="Grounded evidence and provenance"
        className="contribution-ledger-panel"
      >
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
        <details className="investigation-provenance">
          <summary>Decision provenance</summary>
          <dl className="detail-list">
            <div>
              <dt>Rules engine</dt>
              <dd>{data.engine_version}</dd>
            </div>
            <div>
              <dt>Behaviour model</dt>
              <dd>{data.model_version}</dd>
            </div>
            <div>
              <dt>Backend rounding</dt>
              <dd>{data.fusion_projection.rounding_mode}</dd>
            </div>
          </dl>
        </details>
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
      <ConfirmationDialog
        open={noteNavigationBlocker.state === "blocked"}
        title="Discard unsaved analyst note?"
        description="This draft has not been appended to the case history. Leaving now will discard it."
        confirmLabel="Discard note and leave"
        danger
        onClose={() => {
          if (noteNavigationBlocker.state === "blocked") noteNavigationBlocker.reset();
        }}
        onConfirm={() => {
          if (noteNavigationBlocker.state === "blocked") {
            setNote("");
            noteNavigationBlocker.proceed();
          }
        }}
      />
    </>
  );
}
