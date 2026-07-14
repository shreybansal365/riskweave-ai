export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ServiceRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ServiceRequestError";
    this.status = status;
  }
}

export async function requestJson(
  path: string,
  signal: AbortSignal,
  acceptedStatuses: readonly number[] = [200],
): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!acceptedStatuses.includes(response.status)) {
    throw new ServiceRequestError(
      `Service request failed with status ${response.status.toString()}`,
      response.status,
    );
  }

  return response.json() as Promise<unknown>;
}
