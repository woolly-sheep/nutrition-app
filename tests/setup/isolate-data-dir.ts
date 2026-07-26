import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Global test guard: every store resolves its file as
 * `NUTRITION_DATA_DIR ?? process.cwd()/data`. When the env var is unset, a
 * test that calls a real store writer — directly, or via a handler default
 * dependency it forgot to inject (e.g. restoreBackup's replaceAll* defaults)
 * — clobbers the developer's real data/ files. Running `npm test` would then
 * silently wipe registered recipes, supplement products and supplements.
 *
 * Pointing the whole run at a throwaway temp dir makes that impossible: no
 * test can write to the real data directory, whatever it forgets to inject.
 * Runs once per test file (Vitest re-runs setupFiles per file), so it also
 * re-establishes the guard after a suite that manages its own temp dir.
 */
if (!process.env.NUTRITION_DATA_DIR) {
  process.env.NUTRITION_DATA_DIR = mkdtempSync(
    path.join(tmpdir(), "nutrition-test-data-"),
  );
}
