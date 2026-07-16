import { describe, expect, it } from "vitest";

import { deriveApiServiceStatus } from "./api-status";

describe("AppShell API status", () => {
  it("treats authenticated context as connected when liveness fails", () => {
    expect(
      deriveApiServiceStatus({
        healthSucceeded: false,
        contextSucceeded: true,
        healthFailed: true,
        contextFailed: false,
        failureCount: 1,
      }),
    ).toMatchObject({ status: "connected", label: "API connected" });
  });

  it("reports unavailable only after both checks fail", () => {
    expect(
      deriveApiServiceStatus({
        healthSucceeded: false,
        contextSucceeded: false,
        healthFailed: true,
        contextFailed: true,
        failureCount: 2,
      }),
    ).toMatchObject({ status: "degraded", label: "API unavailable" });
  });

  it("distinguishes the initial check from a pending cold-start retry", () => {
    const checking = deriveApiServiceStatus({
      healthSucceeded: false,
      contextSucceeded: false,
      healthFailed: false,
      contextFailed: false,
      failureCount: 0,
    });
    const waking = deriveApiServiceStatus({
      healthSucceeded: false,
      contextSucceeded: false,
      healthFailed: false,
      contextFailed: false,
      failureCount: 1,
    });

    expect(checking).toMatchObject({ status: "checking", label: "Checking API" });
    expect(waking).toMatchObject({ status: "checking", label: "Waking API" });
  });
});
