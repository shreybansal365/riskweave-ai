import { formatDateTime, shortIdentifier, titleCase } from "../lib/format";
import type { Contribution, TimelineItem } from "../types/api";
import { EmptyState } from "./ui";

export function ContributionList({
  title,
  items,
  stream,
}: {
  title: string;
  items: Contribution[];
  stream: "cyber" | "transaction" | "interaction";
}) {
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
          {items.map((item) => (
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
    <ol className="incident-timeline">
      {items.map((item, index) => (
        <li
          key={`${item.source_id}-${item.code}-${index.toString()}`}
          className={`timeline-item timeline-item--${item.item_type}`}
          data-timeline-code={item.code}
        >
          <div className="timeline-marker">
            <span>{String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="timeline-content">
            <div>
              <span>{titleCase(item.item_type)}</span>
              <time dateTime={item.occurred_at}>{formatDateTime(item.occurred_at)}</time>
            </div>
            <h3>{item.label}</h3>
            <p>{item.description}</p>
            <code>{item.code}</code>
          </div>
        </li>
      ))}
    </ol>
  );
}
