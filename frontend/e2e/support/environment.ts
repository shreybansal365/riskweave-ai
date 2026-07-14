export type DemoRole = "analyst" | "admin";

export interface DemoCredential {
  email: string;
  password: string;
}

function required(name: string, fallbackName: string): string {
  const value = process.env[name] ?? process.env[fallbackName];
  if (value === undefined || value === "") {
    throw new Error(`${name} (or ${fallbackName}) is required for browser tests`);
  }
  return value;
}

const configuredRunId = process.env.E2E_RUN_ID?.trim();
const runId = (
  configuredRunId === undefined || configuredRunId === ""
    ? `local-${process.pid.toString()}`
    : configuredRunId
).replaceAll(/[^a-zA-Z0-9-]/g, "-");

export const e2eEnvironment = {
  appUrl: process.env.E2E_BASE_URL ?? "http://localhost:4173",
  apiUrl: process.env.E2E_API_URL ?? "http://localhost:8000",
  runId,
  credentials(role: DemoRole): DemoCredential {
    if (role === "admin") {
      return {
        email: process.env.E2E_ADMIN_EMAIL ?? "admin@riskweave.demo",
        password: required("E2E_ADMIN_PASSWORD", "DEMO_ADMIN_PASSWORD"),
      };
    }
    return {
      email: process.env.E2E_ANALYST_EMAIL ?? "analyst@riskweave.demo",
      password: required("E2E_ANALYST_PASSWORD", "DEMO_ANALYST_PASSWORD"),
    };
  },
};
