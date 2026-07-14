import { useQuery } from "@tanstack/react-query";

import { fetchHealth, fetchReadiness } from "./features/service-status/api";
import { API_BASE_URL } from "./lib/api-client";

type ConnectionState = "checking" | "connected" | "attention" | "unavailable";

interface ServiceRowProps {
  name: string;
  endpoint: string;
  state: ConnectionState;
  label: string;
  detail: string;
}

const statusLabels: Record<ConnectionState, string> = {
  checking: "Checking",
  connected: "Connected",
  attention: "Needs attention",
  unavailable: "Unavailable",
};

function ServiceRow({ name, endpoint, state, label, detail }: ServiceRowProps) {
  return (
    <article className="service-row" aria-label={`${name}: ${statusLabels[state]}`}>
      <div className="service-identity">
        <span
          className={`status-indicator status-indicator--${state}`}
          aria-hidden="true"
        />
        <div>
          <h2>{name}</h2>
          <code>{endpoint}</code>
        </div>
      </div>
      <div className="service-result">
        <span className={`status-label status-label--${state}`}>{label}</span>
        <p>{detail}</p>
      </div>
    </article>
  );
}

export function App() {
  const health = useQuery({
    queryKey: ["system", "health"],
    queryFn: ({ signal }) => fetchHealth(signal),
  });
  const readiness = useQuery({
    queryKey: ["system", "readiness"],
    queryFn: ({ signal }) => fetchReadiness(signal),
  });

  const healthState: ConnectionState = health.isPending
    ? "checking"
    : health.isSuccess
      ? "connected"
      : "unavailable";

  const readinessState: ConnectionState = readiness.isPending
    ? "checking"
    : readiness.isError
      ? "unavailable"
      : readiness.data.status === "ready"
        ? "connected"
        : "attention";

  const healthDetail = health.isPending
    ? "Waiting for the application service to respond."
    : health.isSuccess
      ? `${health.data.service} v${health.data.version} is responding.`
      : "The browser could not reach the application service.";

  const readinessDetail = readiness.isPending
    ? "Verifying PostgreSQL connectivity and migration state."
    : readiness.isError
      ? "The readiness response could not be retrieved."
      : readiness.data.status === "ready"
        ? `PostgreSQL ${readiness.data.checks.database}; migrations ${readiness.data.checks.migrations}.`
        : `PostgreSQL ${readiness.data.checks.database}; migrations ${readiness.data.checks.migrations}.`;

  const retry = () => {
    void health.refetch();
    void readiness.refetch();
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="RiskWeave AI home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-name">
            RiskWeave <strong>AI</strong>
          </span>
        </a>
        <div className="environment-label">
          <span aria-hidden="true" />
          Foundation environment
        </div>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">Milestone 1 · Service foundation</p>
          <h1 id="page-title">Services, visibly connected.</h1>
          <p className="intro-copy">
            RiskWeave now has a typed application boundary, a PostgreSQL-backed readiness
            contract, and a frontend that reports real service state. No banking data or
            product decisions are simulated in this foundation.
          </p>
        </section>

        <section className="connectivity" aria-labelledby="connectivity-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Runtime checks</p>
              <h2 id="connectivity-title">Service connectivity</h2>
            </div>
            <button className="retry-button" type="button" onClick={retry}>
              Retry checks
            </button>
          </div>

          <div className="service-list" aria-live="polite">
            <ServiceRow
              name="Application API"
              endpoint="GET /health"
              state={healthState}
              label={statusLabels[healthState]}
              detail={healthDetail}
            />
            <ServiceRow
              name="Data service"
              endpoint="GET /ready"
              state={readinessState}
              label={statusLabels[readinessState]}
              detail={readinessDetail}
            />
          </div>
        </section>

        <aside className="foundation-note" aria-label="Foundation boundary">
          <span className="note-index">01</span>
          <div>
            <h2>Deliberately narrow</h2>
            <p>
              This shell establishes the real design-system and connectivity foundation.
              Investigation workflows, scenarios, scoring, and banking screens begin only
              after their approved milestones.
            </p>
          </div>
        </aside>
      </main>

      <footer>
        <span>RiskWeave AI · Foundation v0.1.0</span>
        <span className="api-origin" title={API_BASE_URL}>
          API {API_BASE_URL}
        </span>
      </footer>
    </div>
  );
}
