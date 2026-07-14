import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Contribution, TimelineItem } from "../types/api";
import { DecisiveEvidence, IncidentTimeline } from "./incident-components";

function contribution(
  id: string,
  category: string,
  label: string,
  points: number,
  order: number,
): Contribution {
  return {
    contribution_id: id,
    category,
    code: id.toUpperCase(),
    label,
    points,
    explanation: `${label} is grounded in persisted evidence.`,
    source_event_id: category.startsWith("cyber") ? `${id}-event` : null,
    source_transaction_id: category.startsWith("transaction") ? `${id}-tx` : null,
    source_baseline_id: null,
    display_order: order,
  };
}

describe("incident evidence components", () => {
  it("ranks decisive evidence by persisted contribution points without hiding domains", () => {
    render(
      <DecisiveEvidence
        cyber={[contribution("cyber-low", "cyber_rule", "Risky IP", 10, 1)]}
        transaction={[contribution("tx-high", "transaction_rule", "High amount", 18, 1)]}
        interactions={[
          contribution("corr-mid", "correlation", "MFA and high amount", 6, 1),
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("High amount");
    expect(items[1]).toHaveTextContent("Risky IP");
    expect(items[2]).toHaveTextContent("MFA and high amount");
    expect(items[0]).toHaveTextContent("Transaction");
    expect(items[2]).toHaveTextContent("Interaction");
  });

  it("preserves chronological order and labels each timeline lane", () => {
    const items: TimelineItem[] = [
      {
        occurred_at: "2026-07-14T09:01:00Z",
        item_type: "cyber_event",
        code: "mfa_failed",
        label: "MFA failed",
        description: "A failed challenge was recorded.",
        source_id: "cyber-source",
      },
      {
        occurred_at: "2026-07-14T09:30:00Z",
        item_type: "transaction",
        code: "transaction_initiated",
        label: "Transfer initiated",
        description: "The transfer entered its persisted state.",
        source_id: "transaction-source",
      },
      {
        occurred_at: "2026-07-14T09:30:01Z",
        item_type: "incident",
        code: "contextual_decision",
        label: "Decision recorded",
        description: "The backend persisted the contextual decision.",
        source_id: "incident-source",
      },
    ];

    const view = render(<IncidentTimeline items={items} />);
    const rendered = Array.from(view.container.querySelectorAll("[data-timeline-lane]"));
    expect(rendered.map((node) => node.getAttribute("data-timeline-lane"))).toEqual([
      "cyber",
      "transaction",
      "decision",
    ]);
    expect(rendered[0]).toHaveTextContent("MFA failed");
    expect(rendered[1]).toHaveTextContent("Transfer initiated");
    expect(rendered[2]).toHaveTextContent("Decision recorded");
    expect(screen.getAllByText("Evidence provenance")).toHaveLength(3);
  });
});
