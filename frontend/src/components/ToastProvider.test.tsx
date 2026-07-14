import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "./ToastProvider";
import { useToast } from "./use-toast";

function Harness() {
  const { notify } = useToast();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          notify({ tone: "success", title: "Saved", message: "Case updated." });
        }}
      >
        Success
      </button>
      <button
        type="button"
        onClick={() => {
          notify({ tone: "danger", title: "Conflict", message: "Case changed." });
        }}
      >
        Danger
      </button>
    </>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastProvider", () => {
  it("keeps danger feedback persistent until it is dismissed", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Danger" }));
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Case changed.");
    expect(screen.getByRole("alert")).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Conflict" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("pauses timed feedback while the toast is hovered", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Success" }));
    const toast = screen.getByText("Case updated.").closest(".toast");
    expect(toast).not.toBeNull();
    fireEvent.mouseEnter(toast as HTMLElement);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("Case updated.")).toBeVisible();

    fireEvent.mouseLeave(toast as HTMLElement);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.queryByText("Case updated.")).not.toBeInTheDocument();
  });
});
