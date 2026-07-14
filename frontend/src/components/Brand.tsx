import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/overview" aria-label="RiskWeave overview">
      <span className="brand-weave" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span className="brand-wordmark">
          RiskWeave <small>AI</small>
        </span>
      )}
    </Link>
  );
}
