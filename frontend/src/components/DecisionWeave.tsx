import { formatDecimal, shortIdentifier, titleCase } from "../lib/format";
import type {
  Contribution,
  FusionProjection,
  Severity,
  TransactionStatus,
} from "../types/api";

const interactionSourceCodes: Record<string, { cyber: string; transaction: string }> = {
  "correlation.new_device_new_beneficiary": {
    cyber: "cyber.new_device",
    transaction: "transaction.new_beneficiary",
  },
  "correlation.failed_mfa_high_amount": {
    cyber: "cyber.failed_mfa",
    transaction: "transaction.high_amount",
  },
  "correlation.endpoint_velocity_spike": {
    cyber: "cyber.endpoint_alert",
    transaction: "transaction.velocity_spike",
  },
  "correlation.risky_network_new_beneficiary": {
    cyber: "cyber.risky_network",
    transaction: "transaction.new_beneficiary",
  },
  "correlation.impossible_travel_high_amount": {
    cyber: "cyber.impossible_travel",
    transaction: "transaction.high_amount",
  },
};

/**
 * Read-only projection from the authoritative backend scoring contract.
 * The UI must never derive these values or provide client-owned arithmetic fallbacks.
 */
interface DecisionWeaveProps {
  cyberScore: number;
  transactionScore: number;
  correlationBonus: number;
  rawFusedScore: string;
  fusedScore: number;
  severity: Severity;
  recommendedActionLabel: string;
  transactionStatus: TransactionStatus;
  decisionExplanation: string;
  cyberEvidence: Contribution[];
  transactionEvidence: Contribution[];
  interactions: Contribution[];
  fusionProjection?: FusionProjection;
}

function rankEvidence(items: Contribution[]): Contribution[] {
  return [...items]
    .sort(
      (left, right) =>
        right.points - left.points || left.display_order - right.display_order,
    )
    .slice(0, 4);
}

function EvidenceRail({
  domain,
  score,
  items,
}: {
  domain: "cyber" | "transaction";
  score: number;
  items: Contribution[];
}) {
  const ranked = rankEvidence(items);
  const domainLabel = domain === "cyber" ? "Cyber evidence" : "Transaction evidence";
  return (
    <section
      className={`decision-weave__rail decision-weave__rail--${domain}`}
      aria-label={`${domainLabel} rail`}
      data-weave-step={`${domain}-evidence`}
    >
      <header className="decision-weave__rail-header">
        <div>
          <span>{domainLabel}</span>
          <small>Server-owned stream score</small>
        </div>
        <strong>{score}</strong>
      </header>
      {ranked.length === 0 ? (
        <p className="decision-weave__empty-evidence">
          No persisted contribution affected this evidence stream.
        </p>
      ) : (
        <ol className="decision-weave__evidence-list">
          {ranked.map((item) => (
            <li key={item.contribution_id} data-contribution-code={item.code}>
              <span className="decision-weave__evidence-points">+{item.points}</span>
              <span>
                <strong>{item.label}</strong>
                <small>{titleCase(item.category)}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function WeightedTerm({
  domain,
  term,
}: {
  domain: "cyber" | "transaction";
  term: FusionProjection["cyber"] | undefined;
}) {
  const label =
    domain === "cyber"
      ? "Cyber weighted contribution"
      : "Transaction weighted contribution";
  return (
    <section
      className={`decision-weave__term decision-weave__term--${domain}`}
      aria-label={label}
      data-weave-step={`${domain}-term`}
    >
      <span>{label}</span>
      {term === undefined ? (
        <p>Weighted term unavailable from the current backend projection.</p>
      ) : (
        <strong>
          {term.weight} × {term.score} = {term.weighted_term}
        </strong>
      )}
    </section>
  );
}

function InteractionKnot({
  item,
  cyberEvidence,
  transactionEvidence,
}: {
  item: Contribution;
  cyberEvidence: Contribution[];
  transactionEvidence: Contribution[];
}) {
  const sourceCodes = interactionSourceCodes[item.code];
  const mappedCyber =
    sourceCodes === undefined
      ? undefined
      : cyberEvidence.find((candidate) => candidate.code === sourceCodes.cyber);
  const mappedTransaction =
    sourceCodes === undefined
      ? undefined
      : transactionEvidence.find(
          (candidate) => candidate.code === sourceCodes.transaction,
        );
  const cyberMatches = cyberEvidence.filter(
    (candidate) =>
      item.source_event_id !== null && candidate.source_event_id === item.source_event_id,
  );
  const transactionMatches = transactionEvidence.filter(
    (candidate) =>
      item.source_transaction_id !== null &&
      candidate.source_transaction_id === item.source_transaction_id,
  );
  const cyberSource =
    mappedCyber?.label ??
    (cyberMatches.length === 1
      ? cyberMatches[0]?.label
      : item.source_event_id === null
        ? "Documented cyber evidence"
        : `Cyber source ${shortIdentifier(item.source_event_id)}`);
  const transactionSource =
    mappedTransaction?.label ??
    (transactionMatches.length === 1
      ? transactionMatches[0]?.label
      : item.source_transaction_id === null
        ? "Documented transaction evidence"
        : `Transaction source ${shortIdentifier(item.source_transaction_id)}`);

  return (
    <li className="decision-weave__knot" data-contribution-code={item.code}>
      <header>
        <strong>{item.label}</strong>
        <span>+{item.points}</span>
      </header>
      <div className="decision-weave__source-pair" aria-label="Paired evidence sources">
        <span>{cyberSource}</span>
        <i aria-hidden="true">↔</i>
        <span>{transactionSource}</span>
      </div>
      <p>{item.explanation}</p>
      <code>{item.code}</code>
    </li>
  );
}

export function DecisionWeave({
  cyberScore,
  transactionScore,
  correlationBonus,
  rawFusedScore,
  fusedScore,
  severity,
  recommendedActionLabel,
  transactionStatus,
  decisionExplanation,
  cyberEvidence,
  transactionEvidence,
  interactions,
  fusionProjection,
}: DecisionWeaveProps) {
  const authoritativeRaw = fusionProjection?.raw_fused_score ?? rawFusedScore;
  const authoritativeRounded = fusionProjection?.rounded_fused_score ?? fusedScore;
  const displayedInteractionBonus =
    fusionProjection === undefined
      ? String(correlationBonus)
      : new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(fusionProjection.correlation_bonus);
  return (
    <section
      className="decision-weave"
      aria-labelledby="decision-weave-title"
      data-decision-weave
    >
      <header className="decision-weave__header">
        <div>
          <p className="panel-eyebrow">Correlated evidence</p>
          <h2 id="decision-weave-title">How separate signals became one decision</h2>
        </div>
        <span className="decision-weave__bonus-summary">
          Interaction bonus <strong>{displayedInteractionBonus}</strong>
        </span>
      </header>

      <div className="decision-weave__body">
        <EvidenceRail domain="cyber" score={cyberScore} items={cyberEvidence} />
        <WeightedTerm domain="cyber" term={fusionProjection?.cyber} />

        <section
          className="decision-weave__interactions"
          aria-labelledby="decision-weave-interactions-title"
          data-weave-step="interactions"
        >
          <header>
            <div>
              <span id="decision-weave-interactions-title">
                Cross-domain interactions
              </span>
              <small>Only documented eligible rules contribute</small>
            </div>
            <strong>+{displayedInteractionBonus}</strong>
          </header>
          {interactions.length === 0 ? (
            <p className="decision-weave__no-interaction" role="status">
              No eligible cross-domain interaction was recorded for this decision.
            </p>
          ) : (
            <ol className="decision-weave__knot-list">
              {[...interactions]
                .sort((left, right) => left.display_order - right.display_order)
                .map((item) => (
                  <InteractionKnot
                    key={item.contribution_id}
                    item={item}
                    cyberEvidence={cyberEvidence}
                    transactionEvidence={transactionEvidence}
                  />
                ))}
            </ol>
          )}
        </section>

        <WeightedTerm domain="transaction" term={fusionProjection?.transaction} />
        <EvidenceRail
          domain="transaction"
          score={transactionScore}
          items={transactionEvidence}
        />

        <section
          className="decision-weave__decision"
          aria-label="Authoritative fused decision"
          data-weave-step="decision"
        >
          <p>Authoritative decision</p>
          <div className="decision-weave__score-result">
            <span>
              <small>Raw fused value</small>
              <strong>{formatDecimal(authoritativeRaw)}</strong>
            </span>
            <span aria-hidden="true">→</span>
            <span>
              <small>Rounded once by backend</small>
              <strong>{authoritativeRounded}</strong>
            </span>
          </div>
          {fusionProjection !== undefined && (
            <p className="decision-weave__rounding-mode">
              {fusionProjection.rounding_mode}
            </p>
          )}
          <dl className="decision-weave__decision-state">
            <div>
              <dt>Severity</dt>
              <dd>{titleCase(severity)}</dd>
            </div>
            <div>
              <dt>Recommended response</dt>
              <dd>{recommendedActionLabel}</dd>
            </div>
            <div>
              <dt>Transaction</dt>
              <dd>{titleCase(transactionStatus)}</dd>
            </div>
          </dl>
          <p className="decision-weave__explanation">{decisionExplanation}</p>
        </section>
      </div>

      <p className="decision-weave__accessible-summary">
        Separate cyber and transaction evidence, plus only eligible documented
        interactions, converge on the backend-authoritative decision.{" "}
        {decisionExplanation}
      </p>
    </section>
  );
}
