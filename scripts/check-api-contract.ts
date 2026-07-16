import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

/**
 * API contract check: the OpenAPI spec (docs/api/openapi.yaml) and the
 * implemented Next.js route handlers (src/app/api/**\/route.ts) must
 * declare exactly the same path+method pairs. Fails CI on any drift so
 * spec updates always ship in the same PR as route changes.
 */

const SPEC_PATH = path.join("docs", "api", "openapi.yaml");
const ROUTES_DIR = path.join("src", "app", "api");
const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

function specOperations(): Set<string> {
  const spec = parse(readFileSync(SPEC_PATH, "utf-8")) as {
    paths?: Record<string, Record<string, unknown>>;
  };
  const operations = new Set<string>();
  for (const [route, methods] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      if (methods[method]) {
        operations.add(`${method.toUpperCase()} ${route}`);
      }
    }
  }
  return operations;
}

function implementedOperations(): Set<string> {
  const operations = new Set<string>();
  for (const file of routeFiles(ROUTES_DIR)) {
    const relativeDir = path.dirname(path.relative(ROUTES_DIR, file));
    const route =
      relativeDir === "."
        ? "/api"
        : `/api/${relativeDir.split(path.sep).join("/")}`;
    const source = readFileSync(file, "utf-8");
    for (const method of HTTP_METHODS) {
      const exported = new RegExp(
        `export\\s+(async\\s+)?function\\s+${method.toUpperCase()}\\b`,
      );
      if (exported.test(source)) {
        operations.add(`${method.toUpperCase()} ${route}`);
      }
    }
  }
  return operations;
}

function routeFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...routeFiles(full));
      continue;
    }
    if (entry === "route.ts") {
      files.push(full);
    }
  }
  return files;
}

const spec = specOperations();
const implemented = implementedOperations();

const missingInSpec = [...implemented].filter((op) => !spec.has(op)).sort();
const missingInCode = [...spec].filter((op) => !implemented.has(op)).sort();

if (missingInSpec.length > 0 || missingInCode.length > 0) {
  for (const op of missingInSpec) {
    console.error(`implemented but not in openapi.yaml: ${op}`);
  }
  for (const op of missingInCode) {
    console.error(`in openapi.yaml but not implemented: ${op}`);
  }
  process.exit(1);
}

console.log(`api contract OK: ${spec.size} operations in sync.`);
