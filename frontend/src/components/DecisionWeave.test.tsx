import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Contribution, FusionProjection } from "../types/api";
import { DecisionWeave } from "./DecisionWeave";

const cyberEvidence: Contribution[] = [
  {
    contribution_id: "cyber-1",
    category: "cyber_rule",
    code: "cyber.failed_mfa",
    label: "Failed MFA",
    points: 14,
    explanation: "The matched session included a failed MFA challenge.",
    source_event_id: "event-mfa",
    source_transaction_id: null,
    source_baseline_id: null,
    display_order: 1,
  },
];

const transactionEvidence: Contribution[] = [
  {
    contribution_id: "transaction-1",
    category: "transaction_rule",
    code: "transaction.high_amount",
    label: "Unusually high amount",
    points: 18,
    explanation: "The transfer exceeded the persisted customer amount baseline.",
    source_event_id: null,
    source_transaction_id: "transaction-1",
    source_baseline_id: "baseline-1",
    display_order: 1,
  },
];

const interactions: Contribution[] = [
  {
    contribution_id: "interaction-1",
    category: "correlation",
    code: "correlation.failed_mfa_high_amount",
    label: "Failed MFA and high amount",
    points: 6,
    explanation:
      "The failed MFA preceded the high-value transfer in the matched session.",
    source_event_id: "event-mfa",
    source_transaction_id: "transaction-1",
    source_baseline_id: null,
    display_order: 1,
  },
];

const fusionProjection: FusionProjection = {
  cyber: { score: 78, weight: "0.45", weighted_term: "35.10" },
  transaction: { score: 79, weight: "0.45", weighted_term: "35.55" },
  correlation_bonus: 18,
  raw_fused_score: "88.65",
  rounded_fused_score: 89,
  rounding_mode: "ROUND_HALF_UP",
  interaction_source_pairs: [
    {
      interaction_contribution_id: "interaction-1",
      interaction_rule_code: "correlation.failed_mfa_high_amount",
      display_order: 1,
      interaction_source_event_id: "event-mfa",
      interaction_source_transaction_id: "transaction-1",
      interaction_source_baseline_id: "baseline-1",
      cyber_component: {
        contribution_id: "cyber-1",
        category: "cyber_rule",
        rule_code: "cyber.failed_mfa",
        label: "Failed MFA",
        source_event_id: "event-mfa",
        source_transaction_id: null,
        source_baseline_id: null,
      },
      transaction_component: {
        contribution_id: "transaction-1",
        category: "transaction_rule",
        rule_code: "transaction.high_amount",
        label: "Unusually high amount",
        source_event_id: null,
        source_transaction_id: "transaction-1",
        source_baseline_id: "baseline-1",
      },
    },
  ],
};

describe("DecisionWeave", () => {
  it("preserves semantic evidence order and renders backend-authored weighted terms", () => {
    const view = render(
      <DecisionWeave
        cyberScore={78}
        transactionScore={79}
        correlationBonus={18}
        rawFusedScore="88.65"
        fusedScore={89}
        severity="critical"
        recommendedActionLabel="Hold and open critical incident"
        transactionStatus="held"
        decisionExplanation="The persisted evidence justified a critical intervention."
        cyberEvidence={cyberEvidence}
        transactionEvidence={transactionEvidence}
        interactions={interactions}
        fusionProjection={fusionProjection}
      />,
    );

    expect(
      Array.from(view.container.querySelectorAll("[data-weave-step]")).map((node) =>
        node.getAttribute("data-weave-step"),
      ),
    ).toEqual([
      "cyber-evidence",
      "cyber-term",
      "interactions",
      "transaction-term",
      "transaction-evidence",
      "decision",
    ]);
    expect(screen.getByText("0.45 × 78 = 35.10")).toBeVisible();
    expect(screen.getByText("0.45 × 79 = 35.55")).toBeVisible();
    expect(screen.getByText("+18.00")).toBeVisible();
    expect(screen.getByText("ROUND_HALF_UP")).toBeVisible();

    const knot = screen.getByText("Failed MFA and high amount").closest("li");
    expect(knot).not.toBeNull();
    expect(within(knot as HTMLElement).getByText("Failed MFA")).toBeVisible();
    expect(within(knot as HTMLElement).getByText("Unusually high amount")).toBeVisible();
    expect(
      within(knot as HTMLElement).getByLabelText(
        "Backend-authored paired evidence sources",
      ),
    ).toHaveAttribute("data-interaction-contribution-id", "interaction-1");
    expect(screen.getByText("88.65")).toBeVisible();
    expect(screen.getByText("89")).toBeVisible();
  });

  it("uses the non-arithmetic fallback and explains a zero-interaction decision", () => {
    render(
      <DecisionWeave
        cyberScore={40}
        transactionScore={10}
        correlationBonus={0}
        rawFusedScore="22.50"
        fusedScore={23}
        severity="guarded"
        recommendedActionLabel="Allow and monitor"
        transactionStatus="permitted"
        decisionExplanation="The transaction context supported proportionate monitoring."
        cyberEvidence={cyberEvidence}
        transactionEvidence={[]}
        interactions={[]}
      />,
    );

    expect(
      screen.getByText(
        "No eligible cross-domain interaction was recorded for this decision.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Allow and monitor")).toBeVisible();
    expect(screen.getByText("Permitted")).toBeVisible();
    expect(screen.queryByText("Cyber weighted term")).not.toBeInTheDocument();
    expect(screen.queryByText("0.45")).not.toBeInTheDocument();
  });

  it("renders an unfamiliar interaction code from backend-authored component provenance", () => {
    const interaction = interactions[0];
    const sourcePair = fusionProjection.interaction_source_pairs[0];
    if (interaction === undefined || sourcePair === undefined)
      throw new Error("Decision Weave provenance fixture is incomplete");
    const backendOnlyInteraction = {
      ...interaction,
      code: "correlation.backend_owned_rule",
      label: "Backend-owned interaction",
    };
    const backendProjection: FusionProjection = {
      ...fusionProjection,
      interaction_source_pairs: [
        {
          ...sourcePair,
          interaction_rule_code: "correlation.backend_owned_rule",
          cyber_component: {
            ...sourcePair.cyber_component,
            label: "Backend-selected cyber source",
          },
          transaction_component: {
            ...sourcePair.transaction_component,
            label: "Backend-selected transaction source",
          },
        },
      ],
    };

    render(
      <DecisionWeave
        cyberScore={78}
        transactionScore={79}
        correlationBonus={18}
        rawFusedScore="88.65"
        fusedScore={89}
        severity="critical"
        recommendedActionLabel="Hold and open critical incident"
        transactionStatus="held"
        decisionExplanation="The persisted evidence justified a critical intervention."
        cyberEvidence={cyberEvidence}
        transactionEvidence={transactionEvidence}
        interactions={[backendOnlyInteraction]}
        fusionProjection={backendProjection}
      />,
    );

    expect(screen.getByText("Backend-selected cyber source")).toBeVisible();
    expect(screen.getByText("Backend-selected transaction source")).toBeVisible();
  });
});
