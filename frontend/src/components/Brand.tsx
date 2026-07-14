import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/overview" aria-label="RiskWeave overview">
      <svg
        className="brand-weave"
        viewBox="0 0 36 36"
        aria-hidden="true"
        focusable="false"
      >
        <path className="brand-thread brand-thread--cyber" d="M3 8h7l8 10" />
        <path className="brand-thread brand-thread--transaction" d="M3 28h7l8-10" />
        <path className="brand-thread brand-thread--decision" d="M18 18h15" />
        <circle className="brand-knot" cx="18" cy="18" r="3.5" />
        <circle className="brand-node" cx="33" cy="18" r="2" />
      </svg>
      {!compact && (
        <span className="brand-wordmark">
          RiskWeave <small>AI</small>
        </span>
      )}
    </Link>
  );
}
