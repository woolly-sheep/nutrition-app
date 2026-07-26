import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Isolate every test run from the real ./data directory. See the setup
    // file for why this is a safety guard, not just convenience.
    setupFiles: ["./tests/setup/isolate-data-dir.ts"],
  },
});
