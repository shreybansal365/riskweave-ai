import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { Brand, RISKWEAVE_BRAND_NAME, RISKWEAVE_TAGLINE } from "./Brand";

function renderBrand(component: React.ReactNode) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

describe("RiskWeave Brand", () => {
  it("renders the locked Concept A mark and exact full wordmark", () => {
    const view = renderBrand(<Brand to={null} surface="light" />);
    expect(view.container.querySelector('[data-brand-mark="concept-a"]')).toBeVisible();
    expect(view.container.querySelector("[data-brand-wordmark]")).toHaveTextContent(
      /^RiskWeave AI$/,
    );
    expect(view.container.querySelector(".brand-wordmark__ai")).toHaveTextContent("AI");
    expect(view.container.querySelector("small")).not.toBeInTheDocument();
    expect(screen.queryByText(RISKWEAVE_TAGLINE)).not.toBeInTheDocument();
  });

  it("supports light, dark, and size variants without changing the public name", () => {
    const view = renderBrand(
      <>
        <Brand to={null} surface="light" size="small" />
        <Brand to={null} surface="dark" size="large" />
      </>,
    );
    expect(view.container.querySelector(".brand--surface-light")).toBeVisible();
    expect(view.container.querySelector(".brand--surface-dark")).toBeVisible();
    expect(view.container.querySelector(".brand--size-small")).toBeVisible();
    expect(view.container.querySelector(".brand--size-large")).toBeVisible();
    expect(view.container).toHaveTextContent(RISKWEAVE_BRAND_NAME);
    expect(view.container.querySelector('[data-brand-surface="dark"]')).toBeVisible();
    expect(
      view.container.querySelector('[data-brand-geometry="concept-a-reference-v2"]'),
    ).toBeVisible();
    expect(view.container.querySelector(".brand-mark__decision-halo")).toBeNull();
    expect(view.container.querySelector(".brand-mark__endpoint")).not.toHaveAttribute(
      "stroke",
    );
  });

  it("gives icon-only use an accessible product name and supports decorative use", () => {
    const accessible = renderBrand(<Brand variant="icon" to={null} />);
    expect(screen.getByRole("img", { name: RISKWEAVE_BRAND_NAME })).toBeVisible();
    accessible.unmount();

    const decorative = renderBrand(<Brand variant="icon" to={null} decorative />);
    const wrapper = decorative.container.querySelector('.brand[aria-hidden="true"]');
    expect(wrapper).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("uses the optional tagline only when explicitly requested", () => {
    renderBrand(<Brand to={null} showTagline />);
    expect(screen.getByText(RISKWEAVE_TAGLINE)).toBeVisible();
  });

  it("exposes an accessible overview link for application-shell use", () => {
    renderBrand(<Brand surface="dark" />);
    expect(
      screen.getByRole("link", { name: `${RISKWEAVE_BRAND_NAME} overview` }),
    ).toHaveAttribute("href", "/overview");
  });
});
