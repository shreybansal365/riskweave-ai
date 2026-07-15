import { Link } from "react-router-dom";

export const RISKWEAVE_BRAND_NAME = "RiskWeave AI";
export const RISKWEAVE_TAGLINE = "Cyber intelligence. Financial confidence.";

type BrandVariant = "lockup" | "icon";
type BrandSurface = "light" | "dark";
type BrandSize = "small" | "medium" | "large";

interface BrandProps {
  variant?: BrandVariant;
  surface?: BrandSurface;
  size?: BrandSize;
  decorative?: boolean;
  showTagline?: boolean;
  to?: string | null;
  className?: string;
}

function ConceptAMark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 700 240"
      aria-hidden="true"
      focusable="false"
      data-brand-mark="concept-a"
      data-brand-geometry="concept-a-reference-v2"
    >
      <path
        className="brand-mark__strand brand-mark__strand--transaction"
        d="M16 214H104C166 214 217 185 264 107"
      />
      <path
        className="brand-mark__strand brand-mark__strand--cyber"
        d="M282 88C338 39 383 18 422 23C482 29 525 83 610 105"
      />
      <path
        className="brand-mark__strand brand-mark__strand--cyber"
        d="M16 20H115C180 20 235 54 284 104"
      />
      <path
        className="brand-mark__strand brand-mark__strand--decision"
        d="M284 104C301 123 317 146 335 163"
      />
      <path
        className="brand-mark__strand brand-mark__strand--cyber"
        d="M335 163C354 183 374 197 397 203"
      />
      <path
        className="brand-mark__strand brand-mark__strand--decision"
        d="M397 203C429 216 461 216 491 207"
      />
      <path
        className="brand-mark__strand brand-mark__strand--transaction"
        d="M491 207C541 190 575 146 626 124"
      />
      <path
        className="brand-mark__strand brand-mark__strand--decision"
        d="M610 105C620 109 628 115 637 120M626 124C630 122 634 121 637 120M637 120H641"
      />
      <circle className="brand-mark__endpoint" cx="666" cy="120" r="25" />
    </svg>
  );
}

function BrandContents({
  variant,
  showTagline,
}: {
  variant: BrandVariant;
  showTagline: boolean;
}) {
  return (
    <>
      <ConceptAMark />
      {variant === "lockup" && (
        <span className="brand-copy">
          <span className="brand-wordmark" data-brand-wordmark>
            <span className="brand-wordmark__name">RiskWeave</span>{" "}
            <span className="brand-wordmark__ai">AI</span>
          </span>
          {showTagline && <span className="brand-tagline">{RISKWEAVE_TAGLINE}</span>}
        </span>
      )}
    </>
  );
}

export function Brand({
  variant = "lockup",
  surface = "light",
  size = "medium",
  decorative = false,
  showTagline = false,
  to = "/overview",
  className = "",
}: BrandProps) {
  const classes = [
    "brand",
    `brand--${variant}`,
    `brand--surface-${surface}`,
    `brand--size-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const contents = <BrandContents variant={variant} showTagline={showTagline} />;

  if (to !== null) {
    return (
      <Link
        className={classes}
        to={to}
        aria-label={`${RISKWEAVE_BRAND_NAME} overview`}
        data-brand-surface={surface}
      >
        {contents}
      </Link>
    );
  }

  return (
    <span
      className={classes}
      data-brand-surface={surface}
      role={!decorative && variant === "icon" ? "img" : undefined}
      aria-label={!decorative && variant === "icon" ? RISKWEAVE_BRAND_NAME : undefined}
      aria-hidden={decorative ? "true" : undefined}
    >
      {contents}
    </span>
  );
}
