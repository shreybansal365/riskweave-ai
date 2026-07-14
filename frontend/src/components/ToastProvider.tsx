import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ToastContext, type ToastMessage } from "./toast-context";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const notify = useCallback((message: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID();
    setMessages((current) => [...current, { ...message, id }]);
    window.setTimeout(() => {
      setMessages((current) => current.filter((item) => item.id !== id));
    }, 5000);
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
          <div className={`toast toast--${message.tone}`} key={message.id}>
            <strong>{message.title}</strong>
            <span>{message.message}</span>
            <button
              type="button"
              aria-label={`Dismiss ${message.title}`}
              onClick={() => {
                setMessages((current) =>
                  current.filter((item) => item.id !== message.id),
                );
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
