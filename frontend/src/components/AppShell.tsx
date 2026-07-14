import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { systemApi } from "../api/riskweave";
import { useAuth } from "../app/use-auth";
import { API_BASE_URL } from "../lib/api-client";
import { titleCase } from "../lib/format";
import { Brand } from "./Brand";
import { AccessibleTooltip, ServiceStatusIndicator } from "./ui";

const navigation = [
  { to: "/overview", label: "Overview", index: "01" },
  { to: "/incidents", label: "Incidents", index: "02" },
  { to: "/simulator", label: "Simulator", index: "03" },
  { to: "/quantum-readiness", label: "Quantum Readiness", index: "04" },
  { to: "/system-health", label: "System Health", index: "05", adminOnly: true },
  { to: "/evaluation", label: "Evaluation", index: "06" },
] as const;

export function AppShell() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const health = useQuery({
    queryKey: ["system", "health"],
    queryFn: ({ signal }) => systemApi.health(signal),
    refetchInterval: 30_000,
  });
  if (session === null) return null;

  const routeName =
    navigation.find((item) => location.pathname.startsWith(item.to))?.label ??
    "Workspace";
  const serviceState = health.isPending
    ? "checking"
    : health.isSuccess
      ? "connected"
      : "degraded";

  return (
    <div className="product-shell">
      <aside className="side-rail">
        <div className="rail-brand">
          <Brand />
          <span className="workspace-label">Analyst workspace</span>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation
            .filter((item) => !("adminOnly" in item && session.user.role !== "admin"))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item${isActive ? " nav-item--active" : ""}`
                }
              >
                <span>{item.index}</span>
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="rail-foot">
          <p>Deterministic prototype</p>
          <span>Synthetic banking data only</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-topbar">
          <div className="mobile-brand">
            <Brand compact />
          </div>
          <div className="route-context">
            <span>RiskWeave /</span> {routeName}
          </div>
          <div className="workspace-tools">
            <AccessibleTooltip label={`API origin: ${API_BASE_URL}`}>
              <ServiceStatusIndicator
                status={serviceState}
                label={
                  health.isSuccess
                    ? "API connected"
                    : health.isPending
                      ? "Checking API"
                      : "API degraded"
                }
              />
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
                <small>{titleCase(session.user.role)}</small>
              </span>
            </div>
            <button className="logout-button" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <main className="workspace-main" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
