export function deriveApiServiceStatus({
  healthSucceeded,
  contextSucceeded,
  healthFailed,
  contextFailed,
  failureCount,
}: {
  healthSucceeded: boolean;
  contextSucceeded: boolean;
  healthFailed: boolean;
  contextFailed: boolean;
  failureCount: number;
}) {
  const connected = healthSucceeded || contextSucceeded;
  const unavailable = healthFailed && contextFailed;
  if (connected)
    return {
      status: "connected" as const,
      label: "API connected",
      detail: "Authenticated context or liveness check succeeded",
    };
  if (unavailable)
    return {
      status: "degraded" as const,
      label: "API unavailable",
      detail: "Liveness and authenticated context checks failed",
    };
  return {
    status: "checking" as const,
    label: failureCount > 0 ? "Waking API" : "Checking API",
    detail: "Waiting for the free backend to respond",
  };
}
