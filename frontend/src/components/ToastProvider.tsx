import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";

import { ToastContext, type ToastMessage } from "./toast-context";

const TOAST_DURATION_MS = 5000;

function ToastItem({
  message,
  dismiss,
}: {
  message: ToastMessage;
  dismiss: (id: string) => void;
}) {
  const timeoutRef = useRef<number | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(TOAST_DURATION_MS);

  const pause = useCallback(() => {
    if (timeoutRef.current === null) return;
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    remainingRef.current = Math.max(
      0,
      remainingRef.current - (Date.now() - startedAtRef.current),
    );
  }, []);

  const resume = useCallback(() => {
    if (message.tone === "danger" || timeoutRef.current !== null) return;
    startedAtRef.current = Date.now();
    timeoutRef.current = window.setTimeout(() => {
      dismiss(message.id);
    }, remainingRef.current);
  }, [dismiss, message.id, message.tone]);

  useEffect(() => {
    resume();
    return pause;
  }, [pause, resume]);

  useEffect(() => {
    if (message.tone === "danger") toastRef.current?.focus({ preventScroll: true });
  }, [message.tone]);

  const leaveFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    )
      resume();
  };

  return (
    <div
      ref={toastRef}
      className={`toast toast--${message.tone}`}
      role={message.tone === "danger" ? "alert" : undefined}
      tabIndex={message.tone === "danger" ? -1 : undefined}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={leaveFocus}
    >
      <strong>{message.title}</strong>
      <span>{message.message}</span>
      <button
        type="button"
        aria-label={`Dismiss ${message.title}`}
        onClick={() => {
          dismiss(message.id);
        }}
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((message: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID();
    setMessages((current) => [...current, { ...message, id }]);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-region"
        role="status"
        aria-live="polite"
        aria-label="Notifications"
      >
        {messages.map((message) => (
          <ToastItem key={message.id} message={message} dismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
