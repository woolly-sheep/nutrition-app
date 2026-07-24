import { describe, expect, it } from "vitest";
import { loadSeed } from "../../../src/seed/loadSeed";

const seed = loadSeed();

describe("vitamin K seeding", () => {
  it("has an amount row for every food (23rd nutrient)", () => {
    const vkRows = seed.nutrientAmount.filter(
      (r) => r.nutrient_code === "vitamin_k_ug",
    );
    expect(vkRows.length).toBe(seed.foodMaster.length);
    expect(vkRows.every((r) => r.unit === "ug")).toBe(true);
    expect(vkRows.every((r) => r.nutrient_name === "ビタミンK")).toBe(true);
  });

  it("carries the official AI reference (150 μg for adults, no UL)", () => {
    const vkRefs = seed.nutrientReference.filter(
      (r) => r.nutrient_code === "vitamin_k_ug",
    );
    expect(vkRefs.length).toBe(10); // 5 bands × 2 sexes
    expect(vkRefs.every((r) => r.reference_type === "adequate_intake")).toBe(
      true,
    );
    expect(vkRefs.every((r) => r.value === 150)).toBe(true);
    // vitamin K has no tolerable upper intake level in DRI 2025
    expect(
      seed.nutrientReference.some(
        (r) =>
          r.nutrient_code === "vitamin_k_ug" &&
          r.reference_type === "tolerable_upper_intake_level",
      ),
    ).toBe(false);
  });
});
