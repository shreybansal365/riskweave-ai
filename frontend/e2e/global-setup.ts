import { request } from "@playwright/test";

import { apiLogin, prepareShowcaseDataset } from "./support/api";
import { e2eEnvironment } from "./support/environment";

export default async function globalSetup() {
  const context = await request.newContext({ baseURL: e2eEnvironment.apiUrl });
  try {
    const health = await context.get("/health");
    if (!health.ok()) {
      throw new Error(`RiskWeave API health returned ${health.status().toString()}`);
    }
    await apiLogin(context, "analyst");
    await apiLogin(context, "admin");
    await prepareShowcaseDataset(context);
  } finally {
    await context.dispose();
  }
}
