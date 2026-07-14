import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSeed } from "../../src/seed/loadSeed";
import { validateSeed } from "../../src/seed/validateSeed";
import type { SeedManifest } from "../../src/seed/types";

const SEED_DIR = join(__dirname, "../../seed");

function readManifest(): SeedManifest {
  return JSON.parse(
    readFileSync(join(SEED_DIR, "manifest/seed-manifest.json"), "utf-8"),
  );
}

describe("seed validation", () => {
  it("passes for the frozen seed", () => {
    const result = validateSeed();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("loads the expected row counts", () => {
    const seed = loadSeed();
    expect(seed.foodMaster).toHaveLength(40);
    expect(seed.nutrientAmount).toHaveLength(640);
    expect(seed.nutrientReference).toHaveLength(330);
    expect(seed.unitConversion).toHaveLength(6);
  });

  it("matches the manifest checksums (frozen files are untouched)", () => {
    const manifest = readManifest();
    expect(manifest.status).toBe("frozen");
    for (const file of manifest.files) {
      const text = readFileSync(join(SEED_DIR, "frozen", file.name), "utf-8");
      const digest = createHash("sha256").update(text, "utf-8").digest("hex");
      expect(`sha256:${digest}`).toBe(file.checksum);
    }
  });

  it("has exactly 16 nutrient rows for every food", () => {
    const seed = loadSeed();
    const counts = new Map<string, number>();
    for (const row of seed.nutrientAmount) {
      counts.set(row.food_id, (counts.get(row.food_id) ?? 0) + 1);
    }
    expect(counts.size).toBe(40);
    expect([...counts.values()].every((count) => count === 16)).toBe(true);
  });
});
