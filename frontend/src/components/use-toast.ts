import { useContext } from "react";

import { ToastContext } from "./toast-context";

export function useToast() {
  const value = useContext(ToastContext);
  if (value === null) throw new Error("useToast must be used within ToastProvider");
  return value;
}
