import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { titleCase } from "../lib/format";
import type { Severity } from "../types/api";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions !== undefined && <div className="page-actions">{actions}</div>}
    </header>
  );
}

type BadgeTone = "neutral" | "teal" | "green" | "amber" | "red" | "blue";

export function Badge({ value, tone = "neutral" }: { value: string; tone?: BadgeTone }) {
  return <span className={`badge badge--${tone}`}>{titleCase(value)}</span>;
}

export function RiskBadge({ severity }: { severity: Severity }) {
  const tone: Record<Severity, BadgeTone> = {
    low: "green",
    guarded: "teal",
    elevated: "amber",
    high: "red",
    critical: "red",
  };
  return <Badge value={severity} tone={tone[severity]} />;
}

export function StatusBadge({ status }: { status: string }) {
  const tone: BadgeTone =
    status === "permitted" || status === "legitimate" || status === "released"
      ? "green"
      : status === "held" || status === "confirmed_fraud" || status === "declined"
        ? "red"
        : status === "in_review" || status === "pending"
          ? "amber"
          : "neutral";
  return <Badge value={status} tone={tone} />;
}

export function ScoreDisplay({
  label,
  score,
  detail,
  accent = "neutral",
}: {
  label: string;
  score: number | string;
  detail?: string;
  accent?: "neutral" | "cyber" | "transaction" | "fused" | "bonus";
}) {
  return (
    <div className={`score-display score-display--${accent}`}>
      <span>{label}</span>
      <strong>{score}</strong>
      {detail !== undefined && <small>{detail}</small>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  context,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  context: string;
  tone?: BadgeTone;
}) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{context}</p>
    </article>
  );
}

export function Panel({
  title,
  eyebrow,
  aside,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      <header className="panel-header">
        <div>
          {eyebrow !== undefined && <p className="panel-eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {aside !== undefined && <div>{aside}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Button({
  tone = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "danger" | "quiet";
}) {
  return <button className={`button button--${tone} ${className}`.trim()} {...props} />;
}

export function LoadingSkeleton({ label = "Loading content" }: { label?: string }) {
  return (
    <div className="loading-skeleton" role="status" aria-label={label}>
      <span />
      <span />
      <span />
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-message state-message--empty">
      <span className="state-index" aria-hidden="true">
        00
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "This view could not be loaded",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-message state-message--error" role="alert">
      <span className="state-index" aria-hidden="true">
        !
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry !== undefined && (
        <Button type="button" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function ServiceStatusIndicator({
  status,
  label,
}: {
  status: "connected" | "degraded" | "checking";
  label: string;
}) {
  return (
    <span className={`service-chip service-chip--${status}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}

export function AccessibleTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <span className="tooltip" tabIndex={0} aria-describedby={id}>
      {children}
      <span className="tooltip-content" id={id} role="tooltip">
        {label}
      </span>
    </span>
  );
}

export function EnterpriseTable({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      <table className="enterprise-table">{children}</table>
    </div>
  );
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }
      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [busy, onClose, open]);

  if (!open) return null;
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={() => {
        if (!busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <p className="panel-eyebrow">Confirm action</p>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="dialog-actions">
          <button
            className="button button--secondary"
            type="button"
            ref={cancelRef}
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <Button
            type="button"
            tone={danger ? "danger" : "primary"}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
