import { createContext } from "react";

export interface ToastMessage {
  id: string;
  tone: "success" | "danger" | "info";
  title: string;
  message: string;
}

export interface ToastContextValue {
  notify: (message: Omit<ToastMessage, "id">) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
