import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { AuthProvider } from "./app/AuthProvider";
import { createQueryClient } from "./app/query-client";
import { ToastProvider } from "./components/ToastProvider";
import "./styles/global.css";

const container = document.getElementById("root");

if (container === null) {
  throw new Error("RiskWeave root element is missing");
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
