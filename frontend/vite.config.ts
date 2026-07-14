import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/vite-env.d.ts"],
      reportOnFailure: true,
    },
  },
});
