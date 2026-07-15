import { lazy, Suspense, useEffect, useMemo, type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  type RouteObject,
} from "react-router-dom";

import { useAuth } from "./app/use-auth";
import { AppShell } from "./components/AppShell";
import { ErrorState, LoadingSkeleton } from "./components/ui";

const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const OverviewPage = lazy(() =>
  import("./pages/OverviewPage").then((module) => ({ default: module.OverviewPage })),
);
const IncidentsPage = lazy(() =>
  import("./pages/IncidentsPage").then((module) => ({ default: module.IncidentsPage })),
);
const IncidentDetailPage = lazy(() =>
  import("./pages/IncidentDetailPage").then((module) => ({
    default: module.IncidentDetailPage,
  })),
);
const SimulatorPage = lazy(() =>
  import("./pages/SimulatorPage").then((module) => ({ default: module.SimulatorPage })),
);
const QuantumReadinessPage = lazy(() =>
  import("./pages/QuantumReadinessPage").then((module) => ({
    default: module.QuantumReadinessPage,
  })),
);
const SystemHealthPage = lazy(() =>
  import("./pages/SystemHealthPage").then((module) => ({
    default: module.SystemHealthPage,
  })),
);
const EvaluationPage = lazy(() =>
  import("./pages/EvaluationPage").then((module) => ({ default: module.EvaluationPage })),
);

function RouteLoading({ children }: { children: ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    const routeName =
      location.pathname === "/login"
        ? "Sign in"
        : location.pathname === "/overview"
          ? "Operational overview"
          : location.pathname === "/incidents"
            ? "Incident queue"
            : location.pathname.startsWith("/incidents/")
              ? "Incident investigation"
              : location.pathname === "/simulator"
                ? "Scenario simulator"
                : location.pathname === "/quantum-readiness"
                  ? "Quantum readiness"
                  : location.pathname === "/system-health"
                    ? "System health"
                    : location.pathname === "/evaluation"
                      ? "Evaluation"
                      : "Workspace";
    document.title = `${routeName} · RiskWeave AI`;

    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>(
        'main [data-route-focus-target="true"]',
      );
      if (heading === null) return false;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      return true;
    };

    if (focusHeading()) return undefined;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [location.pathname]);

  return (
    <Suspense fallback={<LoadingSkeleton label="Loading RiskWeave view" />}>
      {children}
    </Suspense>
  );
}

function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();
  if (session === null)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  return <Outlet />;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session?.user.role !== "admin") return <Navigate to="/overview" replace />;
  return children;
}

function StartRoute() {
  const { session } = useAuth();
  return <Navigate to={session === null ? "/login" : "/overview"} replace />;
}

function RouteFailure() {
  return (
    <ErrorState
      title="This workspace view failed"
      message="RiskWeave contained the route failure. Return to the overview or retry the page."
    />
  );
}

function NotFoundPage() {
  return (
    <main className="not-found">
      <p className="eyebrow">404 · Unknown route</p>
      <h1 data-route-focus-target="true">This workspace path does not exist.</h1>
      <p>
        Return to the operational overview and continue from a supported product route.
      </p>
      <a href="/overview">Return to overview</a>
    </main>
  );
}

const riskWeaveRoutes: RouteObject[] = [
  { path: "/", element: <StartRoute /> },
  {
    path: "/login",
    element: (
      <RouteLoading>
        <LoginPage />
      </RouteLoading>
    ),
    errorElement: <RouteFailure />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        errorElement: <RouteFailure />,
        children: [
          {
            path: "/overview",
            element: (
              <RouteLoading>
                <OverviewPage />
              </RouteLoading>
            ),
          },
          {
            path: "/incidents",
            element: (
              <RouteLoading>
                <IncidentsPage />
              </RouteLoading>
            ),
          },
          {
            path: "/incidents/:incidentId",
            element: (
              <RouteLoading>
                <IncidentDetailPage />
              </RouteLoading>
            ),
          },
          {
            path: "/simulator",
            element: (
              <RouteLoading>
                <SimulatorPage />
              </RouteLoading>
            ),
          },
          {
            path: "/quantum-readiness",
            element: (
              <RouteLoading>
                <QuantumReadinessPage />
              </RouteLoading>
            ),
          },
          {
            path: "/system-health",
            element: (
              <RequireAdmin>
                <RouteLoading>
                  <SystemHealthPage />
                </RouteLoading>
              </RequireAdmin>
            ),
          },
          {
            path: "/evaluation",
            element: (
              <RouteLoading>
                <EvaluationPage />
              </RouteLoading>
            ),
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];

export function App() {
  const router = useMemo(() => createBrowserRouter(riskWeaveRoutes), []);
  return <RouterProvider router={router} />;
}
