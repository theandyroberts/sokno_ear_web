import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // Worktrees under .claude/ carry their own copy of tests/ and resolve a different
    // node_modules; they are somebody's working copy, not this repo's suite.
    exclude: ["**/node_modules/**", "**/dist/**", ".claude/**"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
