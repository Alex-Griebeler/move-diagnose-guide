import { defineConfig } from "vitest/config";
import path from "path";

// Separate from vite.config.ts so tests don't load the build plugins (mcpPlugin, lovable-tagger).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Each database test replays every migration in PGlite.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
