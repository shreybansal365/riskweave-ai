import { useState, type SyntheticEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../app/use-auth";
import { Brand } from "../components/Brand";
import { ApiError } from "../lib/api-client";

function loginFailure(error: unknown): string {
  if (!(error instanceof ApiError)) return "The authentication service is unavailable.";
  if (error.status === 401) return "The email or password is incorrect.";
  if (error.status === 429) {
    const wait =
      error.retryAfter === null ? "shortly" : `in ${error.retryAfter.toString()} seconds`;
    return `Too many attempts. Try again ${wait}.`;
  }
  if (error.status === 503)
    return "Authentication is not configured for this environment.";
  return `${error.message}${error.requestId === null ? "" : ` Reference ${error.requestId}.`}`;
}

export function LoginPage() {
  const { session, sessionNotice, login, clearSessionNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const returnTo = (location.state as { from?: string } | null)?.from ?? "/overview";
  if (session !== null) return <Navigate to={returnTo} replace />;

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      clearSessionNotice();
      void navigate(returnTo, { replace: true });
    } catch (caught) {
      setPassword("");
      setError(loginFailure(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-layout">
      <section className="login-context" aria-labelledby="login-context-title">
        <Brand />
        <div>
          <p className="eyebrow">Contextual risk operations</p>
          <h1 id="login-context-title">One incident. Every relevant signal.</h1>
          <p>
            RiskWeave correlates cyber telemetry with transaction behaviour so analysts
            can investigate one explainable case instead of disconnected alerts.
          </p>
        </div>
        <div className="login-environment">
          <span>Protected demonstration workspace</span>
          <strong>Deterministic synthetic banking data</strong>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <form onSubmit={(event) => void submit(event)}>
          <p className="panel-eyebrow">Risk operations</p>
          <h2 id="login-title">Sign in to the workspace</h2>
          <p className="login-help">
            Use a seeded analyst or administrator account configured on the backend.
          </p>
          {sessionNotice !== null && (
            <div className="session-alert" role="alert">
              <span>{sessionNotice}</span>
              <button type="button" onClick={clearSessionNotice}>
                Dismiss
              </button>
            </div>
          )}
          <label>
            Email address
            <input
              autoComplete="username"
              inputMode="email"
              type="email"
              value={email}
              required
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              required
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
          </label>
          {error !== null && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? "Verifying access…" : "Continue securely"}
          </button>
          <p className="session-note">
            This prototype keeps access tokens in memory. A page refresh requires
            authentication again.
          </p>
        </form>
      </section>
    </main>
  );
}
