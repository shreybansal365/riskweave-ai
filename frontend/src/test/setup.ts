import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";

class TestResizeObserver implements ResizeObserver {
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
  disconnect() {
    return undefined;
  }
}

globalThis.ResizeObserver = TestResizeObserver;

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/");
});
