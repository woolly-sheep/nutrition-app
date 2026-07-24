import { describe, expect, it } from "vitest";
import { saveSupplement } from "../../../src/server/api/handlers/saveSupplement";
import type {
  CreateSupplementRequest,
  SupplementRecord,
} from "../../../src/server/api/schemas/supplements";

const persist = async (
  input: CreateSupplementRequest,
): Promise<SupplementRecord> => ({
  ...input,
  supplement_id: "sup_test",
  recorded_at: "2026-07-24T00:00:00.000Z",
});

describe("saveSupplement", () => {
  it("saves a valid record", async () => {
    const result = await saveSupplement(
      {
        date: "2026-07-24",
        product_name: "  マルチビタミン  ",
        amounts: [{ nutrient_code: "iron_mg", amount: 5 }],
      },
      persist,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.supplement.product_name).toBe("マルチビタミン");
      expect(result.supplement.amounts).toEqual([
        { nutrient_code: "iron_mg", amount: 5 },
      ]);
    }
  });

  it("rejects an unknown nutrient, a blank name, and a bad date with codes only", async () => {
    const result = await saveSupplement(
      {
        date: "24-07-2026",
        product_name: "   ",
        amounts: [{ nutrient_code: "energy_kcal", amount: 10 }],
      },
      persist,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const serialized = JSON.stringify(result.problem);
      expect(serialized).toContain("invalid_date");
      expect(serialized).toContain("invalid_product_name");
      expect(serialized).toContain("amount_0_nutrient");
    }
  });

  it("rejects a non-positive amount and a duplicate nutrient", async () => {
    const badAmount = await saveSupplement(
      {
        date: "2026-07-24",
        product_name: "x",
        amounts: [{ nutrient_code: "iron_mg", amount: 0 }],
      },
      persist,
    );
    expect(badAmount.ok).toBe(false);

    const dup = await saveSupplement(
      {
        date: "2026-07-24",
        product_name: "x",
        amounts: [
          { nutrient_code: "iron_mg", amount: 5 },
          { nutrient_code: "iron_mg", amount: 3 },
        ],
      },
      persist,
    );
    expect(dup.ok).toBe(false);
    if (!dup.ok) {
      expect(JSON.stringify(dup.problem)).toContain("duplicate");
    }
  });

  it("never echoes the product name into errors", async () => {
    const result = await saveSupplement(
      {
        date: "bad",
        product_name: "SECRET_BRAND_NAME",
        amounts: [],
      },
      persist,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(JSON.stringify(result.problem)).not.toContain("SECRET_BRAND_NAME");
    }
  });
});
