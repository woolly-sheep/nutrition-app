import { describe, expect, it } from "vitest";
import { saveSupplementProduct } from "../../../src/server/api/handlers/saveSupplementProduct";
import type {
  CreateSupplementProductRequest,
  SupplementProduct,
} from "../../../src/server/api/schemas/supplementProducts";

const persist = async (
  input: CreateSupplementProductRequest,
): Promise<SupplementProduct> => ({
  ...input,
  product_id: "sprod_test",
  created_at: "2026-07-24T00:00:00.000Z",
});

describe("saveSupplementProduct", () => {
  it("saves a per-10-tablet preset", async () => {
    const result = await saveSupplementProduct(
      {
        name: "  エビオス錠  ",
        serving_count: 10,
        serving_unit: "錠",
        amounts: [
          { nutrient_code: "vitamin_b1_mg", amount: 0.6 },
          { nutrient_code: "vitamin_b2_mg", amount: 0.3 },
        ],
      },
      persist,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.product.name).toBe("エビオス錠");
      expect(result.product.serving_count).toBe(10);
      expect(result.product.amounts).toHaveLength(2);
    }
  });

  it("accepts food-untracked nutrients like omega-3 and vitamin K", async () => {
    const result = await saveSupplementProduct(
      {
        name: "フィッシュオイル",
        serving_count: 2,
        serving_unit: "粒",
        amounts: [
          { nutrient_code: "omega3_g", amount: 1.2 },
          { nutrient_code: "vitamin_k_ug", amount: 50 },
        ],
      },
      persist,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a bad serving count and an unknown nutrient with codes only", async () => {
    const result = await saveSupplementProduct(
      {
        name: "x",
        serving_count: 0,
        serving_unit: "錠",
        amounts: [{ nutrient_code: "energy_kcal", amount: 5 }],
      },
      persist,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const serialized = JSON.stringify(result.problem);
      expect(serialized).toContain("invalid_serving_count");
      expect(serialized).toContain("amount_0_nutrient");
    }
  });

  it("never echoes the product name into errors", async () => {
    const result = await saveSupplementProduct(
      { name: "SECRET_BRAND", serving_count: -1, serving_unit: "", amounts: [] },
      persist,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(JSON.stringify(result.problem)).not.toContain("SECRET_BRAND");
    }
  });
});
