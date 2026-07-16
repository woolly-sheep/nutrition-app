import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Logging allowlist check (handoff 10 / application design v0.2 §9.3).
 *
 * Policy: nothing under src/ may log meal contents, analysis results,
 * recommendation text, or raw request/response bodies. Until a
 * structured allowlist logger exists, the enforceable rule is simple:
 * no console.* calls in src/ at all. When logging is introduced, route
 * it through a logger module and add that module (alone) to ALLOWLIST.
 */

const SRC_DIR = "src";

/** Files allowed to call console.* (future logger module only). */
const ALLOWLIST = new Set<string>([]);

const CONSOLE_CALL = /\bconsole\s*\.\s*(log|info|warn|error|debug|trace)\b/;

const violations: string[] = [];

for (const file of sourceFiles(SRC_DIR)) {
  const normalized = file.split(path.sep).join("/");
  if (ALLOWLIST.has(normalized)) {
    continue;
  }
  const lines = readFileSync(file, "utf-8").split("\n");
  lines.forEach((line, index) => {
    if (CONSOLE_CALL.test(line)) {
      violations.push(`${normalized}:${index + 1}: ${line.trim()}`);
    }
  });
}

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...sourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

if (violations.length > 0) {
  console.error(
    "console.* found in src/ — logging must go through an allowlisted logger:",
  );
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  process.exit(1);
}

console.log("logging allowlist OK: no console.* calls in src/.");
