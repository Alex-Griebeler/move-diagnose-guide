import { defineConfig } from "vitest/config";
import path from "path";

// Separate from vite.config.ts so tests don't load the build plugins (mcpPlugin, lovable-tagger).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // vite.config.ts compiles JSX with plugin-react-swc; here esbuild needs the automatic runtime for .tsx tests.
  esbuild: { jsx: "automatic" },
  test: {
    // UI tests opt into jsdom per file (// @vitest-environment jsdom); the rest stays in Node.
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Each database test replays every migration in PGlite.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
