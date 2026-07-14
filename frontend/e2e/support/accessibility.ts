import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    })),
    "serious or critical axe violations",
  ).toEqual([]);
}
