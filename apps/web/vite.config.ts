import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5290,
    strictPort: true,
    proxy: { "/api": process.env.HUNCH_API ?? "http://localhost:8787" },
  },
  test: { include: ["src/**/*.test.ts"] },
});
