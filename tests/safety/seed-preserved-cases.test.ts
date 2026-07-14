import { describe, expect, it } from "vitest";
import { loadSeed } from "../../src/seed/loadSeed";

/**
 * Preserved official cases from the seed freeze review v1.3.
 * These values must be read as-is; the app must never "fix" them.
 */
describe("preserved seed cases", () => {
  const seed = loadSeed();

  it("keeps iron UL as not_established", () => {
    const ironUl = seed.nutrientReference.filter(
      (r) =>
        r.nutrient_code === "iron_mg" &&
        r.reference_type === "tolerable_upper_intake_level",
    );
    expect(ironUl.length).toBeGreaterThan(0);
    expect(ironUl.every((r) => r.value === "not_established")).toBe(true);
  });

  it("keeps the menstrual-condition split on iron female rows", () => {
    const ironFemaleRda = seed.nutrientReference.filter(
      (r) =>
        r.nutrient_code === "iron_mg" &&
        r.sex === "female" &&
        r.reference_type === "recommended_dietary_allowance",
    );
    // Official table splits by menstrual condition up to age 64;
    // 65+ rows are single values in the source and stay that way.
    const splitBands = ["adult_18_29", "adult_30_49", "adult_50_64"];
    const splitRows = ironFemaleRda.filter((r) => splitBands.includes(r.age_band));
    expect(splitRows).toHaveLength(splitBands.length);
    expect(
      splitRows.every(
        (r) =>
          String(r.value).includes("no_menses") &&
          String(r.value).includes("menses"),
      ),
    ).toBe(true);
  });

  it("keeps vitamin A in ug (ugRAE)", () => {
    const rows = [
      ...seed.nutrientAmount.filter((r) => r.nutrient_code === "vitamin_a_ug"),
      ...seed.nutrientReference.filter((r) => r.nutrient_code === "vitamin_a_ug"),
    ];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.unit === "ug")).toBe(true);
  });

  it("keeps official table values as extracted (spot check: 白ごはん)", () => {
    const rice = seed.nutrientAmount.find(
      (r) => r.food_id === "food_rice_cooked_white_001" && r.nutrient_code === "energy_kcal",
    );
    expect(rice?.amount_per_100g).toBe(156);
    expect(rice?.value_status).toBe("official_value");
    expect(rice?.unit).toBe("kcal");
  });

  it("keeps unit conversion as optional support (explicit grams first)", () => {
    expect(
      seed.unitConversion.every(
        (r) => r.review_status === "use_explicit_grams_preferred",
      ),
    ).toBe(true);
  });
});
