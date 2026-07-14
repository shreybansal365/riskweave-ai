import { formatDateTime, shortIdentifier, titleCase } from "../lib/format";
import type { Contribution, TimelineItem } from "../types/api";
import { EmptyState } from "./ui";

type ContributionStream = "cyber" | "transaction" | "interaction";

function streamForContribution(item: Contribution): ContributionStream {
  if (item.category === "correlation") return "interaction";
  return item.category.startsWith("cyber") ? "cyber" : "transaction";
}

function rankContributions(items: Contribution[]): Contribution[] {
  return [...items].sort(
    (left, right) =>
      right.points - left.points || left.display_order - right.display_order,
  );
}

export function DecisiveEvidence({
  cyber,
  transaction,
  interactions,
  limit = 6,
}: {
  cyber: Contribution[];
  transaction: Contribution[];
  interactions: Contribution[];
  limit?: number;
}) {
  const ranked = rankContributions([...cyber, ...transaction, ...interactions]).slice(
    0,
    limit,
  );
  if (ranked.length === 0)
    return (
      <EmptyState
        title="No decisive evidence"
        message="This incident contains no persisted risk contribution."
      />
    );
  return (
    <ol className="decisive-evidence-list">
      {ranked.map((item, index) => {
        const stream = streamForContribution(item);
        return (
          <li
            key={item.contribution_id}
            className={`decisive-evidence-item decisive-evidence-item--${stream}`}
            data-contribution-code={item.code}
          >
            <span
              className="decisive-evidence-rank"
              aria-label={`Rank ${String(index + 1)}`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <span className="decisive-evidence-stream">{titleCase(stream)}</span>
              <strong>{item.label}</strong>
              <p>{item.explanation}</p>
            </div>
            <span className="decisive-evidence-points">+{item.points}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ContributionList({
  title,
  items,
  stream,
}: {
  title: string;
  items: Contribution[];
  stream: ContributionStream;
}) {
  const ordered = [...items].sort(
    (left, right) => left.display_order - right.display_order,
  );
  return (
    <section className={`contribution-group contribution-group--${stream}`}>
      <header>
        <h3>{title}</h3>
        <span>{items.reduce((sum, item) => sum + item.points, 0)} points shown</span>
      </header>
      {items.length === 0 ? (
        <p className="quiet-copy">
          No contribution in this stream affected the persisted decision.
        </p>
      ) : (
        <ol>
          {ordered.map((item) => (
            <li key={item.contribution_id} data-contribution-code={item.code}>
              <span className="contribution-points">+{item.points}</span>
              <div>
                <strong>{item.label}</strong>
                <code>{item.code}</code>
                <p>{item.explanation}</p>
                <small>
                  Source{" "}
                  {shortIdentifier(
                    item.source_event_id ??
                      item.source_transaction_id ??
                      item.source_baseline_id ??
                      "persisted-engine-output",
                  )}
                </small>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function IncidentTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0)
    return (
      <EmptyState
        title="No timeline events"
        message="This incident contains no persisted timeline entries."
      />
    );
  return (
    <ol className="incident-timeline" aria-label="Chronological incident evidence">
      {items.map((item, index) => (
        <li
          key={`${item.source_id}-${item.code}-${index.toString()}`}
          className={`timeline-item timeline-item--${item.item_type}`}
          data-timeline-code={item.code}
          data-timeline-lane={
            item.item_type === "cyber_event"
              ? "cyber"
              : item.item_type === "beneficiary" || item.item_type === "transaction"
                ? "transaction"
                : item.item_type === "incident"
                  ? "decision"
                  : "analyst"
          }
        >
          <div className="timeline-marker">
            <span>{String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="timeline-content">
            <div>
              <span>
                {item.item_type === "cyber_event"
                  ? "Cyber evidence"
                  : item.item_type === "beneficiary" || item.item_type === "transaction"
                    ? "Transaction evidence"
                    : item.item_type === "incident"
                      ? "RiskWeave decision"
                      : "Analyst workflow"}
              </span>
              <time dateTime={item.occurred_at}>{formatDateTime(item.occurred_at)}</time>
            </div>
            <h3>{item.label}</h3>
            <p>{item.description}</p>
            <details className="timeline-provenance">
              <summary>Evidence provenance</summary>
              <code>
                {item.code} · {shortIdentifier(item.source_id)}
              </code>
            </details>
          </div>
        </li>
      ))}
    </ol>
  );
}
