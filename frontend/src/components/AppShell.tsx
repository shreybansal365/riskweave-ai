import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { systemApi } from "../api/riskweave";
import { useAuth } from "../app/use-auth";
import { API_BASE_URL } from "../lib/api-client";
import { deriveApiServiceStatus } from "../lib/api-status";
import { formatDateTime, titleCase } from "../lib/format";
import { Brand } from "./Brand";
import { AccessibleTooltip, ServiceStatusIndicator } from "./ui";

interface NavigationItem {
  to: string;
  label: string;
  adminOnly?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    label: "Operations",
    items: [
      { to: "/overview", label: "Overview" },
      { to: "/incidents", label: "Incidents" },
    ],
  },
  {
    label: "Demonstration",
    items: [{ to: "/simulator", label: "Simulator" }],
  },
  {
    label: "Resilience & evidence",
    items: [
      { to: "/quantum-readiness", label: "Quantum Readiness" },
      { to: "/evaluation", label: "Evaluation" },
    ],
  },
  {
    label: "Administration",
    items: [{ to: "/system-health", label: "System Health", adminOnly: true }],
  },
];

const navigation = navigationGroups.flatMap((group) => group.items);

const coldStartRetryDelay = (attemptIndex: number) =>
  Math.min(1_500 * 2 ** attemptIndex, 12_000);

export function AppShell() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const health = useQuery({
    queryKey: ["system", "health"],
    queryFn: ({ signal }) => systemApi.health(signal),
    refetchInterval: 30_000,
    retry: 6,
    retryDelay: coldStartRetryDelay,
  });
  const context = useQuery({
    queryKey: ["system", "context"],
    queryFn: ({ signal }) => systemApi.context(session?.token ?? "", signal),
    enabled: session !== null,
    staleTime: 30_000,
    retry: 6,
    retryDelay: coldStartRetryDelay,
  });
  if (session === null) return null;

  const routeName =
    navigation.find((item) => location.pathname.startsWith(item.to))?.label ??
    "Workspace";
  const service = deriveApiServiceStatus({
    healthSucceeded: health.isSuccess,
    contextSucceeded: context.isSuccess,
    healthFailed: health.isError,
    contextFailed: context.isError,
    failureCount: health.failureCount + context.failureCount,
  });
  const contextHeading = context.isPending
    ? "Loading environment context"
    : context.isError
      ? "Environment context unavailable"
      : context.data.environment_label;
  const contextDetail = context.isPending
    ? "Deterministic synthetic dataset"
    : context.isError
      ? "Context service degraded · operational data remains API-backed"
      : `${context.data.dataset_version} · ${context.data.dataset_state_label}`;

  return (
    <div className="product-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="side-rail">
        <div className="rail-brand">
          <Brand surface="dark" />
          <span className="workspace-label">Analyst workspace</span>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !("adminOnly" in item && session.user.role !== "admin"),
            );
            if (visibleItems.length === 0) return null;
            return (
              <section className="nav-group" key={group.label}>
                <h2>{group.label}</h2>
                <div>
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `nav-item${isActive ? " nav-item--active" : ""}`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </section>
            );
          })}
        </nav>
        <div className="rail-foot">
          <p>{contextHeading}</p>
          <span>{contextDetail}</span>
          {context.data !== undefined && (
            <span>Simulation epoch {formatDateTime(context.data.simulation_epoch)}</span>
          )}
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-topbar">
          <div className="mobile-brand">
            <Brand variant="icon" surface="light" size="small" />
          </div>
          <div className="route-context" aria-label={`Current route: ${routeName}`}>
            <span>Workspace</span>
            <strong>{routeName}</strong>
          </div>
          <div className="workspace-tools">
            {context.isSuccess && (
              <div className="shell-context" aria-label="Environment and dataset context">
                <span>
                  <small>Environment</small>
                  <strong title={context.data.environment_label}>
                    {context.data.environment_label}
                  </strong>
                </span>
                <span>
                  <small>Dataset</small>
                  <strong title={context.data.dataset_state_label}>
                    {context.data.dataset_state_label}
                  </strong>
                </span>
              </div>
            )}
            <AccessibleTooltip label={`API origin: ${API_BASE_URL}. ${service.detail}.`}>
              <ServiceStatusIndicator status={service.status} label={service.label} />
            </AccessibleTooltip>
            <div className="user-summary">
              <span className="user-monogram" aria-hidden="true">
                {session.user.display_name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part.charAt(0))
                  .join("")}
              </span>
              <span>
                <strong>{session.user.display_name}</strong>
                <small>
                  {session.user.access_mode === "demo_read_only"
                    ? "Read-only demo"
                    : titleCase(session.user.role)}
                </small>
              </span>
            </div>
            <button className="logout-button" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <main className="workspace-main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
