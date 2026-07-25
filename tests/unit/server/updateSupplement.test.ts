import { describe, expect, it } from "vitest";
import { updateSupplement } from "../../../src/server/api/handlers/updateSupplement";
import type {
  CreateSupplementRequest,
  SupplementRecord,
} from "../../../src/server/api/schemas/supplements";

const existing: SupplementRecord = {
  supplement_id: "sup_1",
  date: "2026-07-24",
  product_name: "旧マルチビタミン",
  amounts: [{ nutrient_code: "iron_mg", amount: 5 }],
  recorded_at: "2026-07-24T00:00:00.000Z",
};

const persist = async (
  id: string,
  input: Pick<CreateSupplementRequest, "product_name" | "amounts">,
): Promise<SupplementRecord | null> =>
  id === existing.supplement_id
    ? { ...existing, product_name: input.product_name, amounts: input.amounts }
    : null;

describe("updateSupplement", () => {
  it("replaces the name and amounts but keeps id, date and recorded_at", async () => {
    const result = await updateSupplement(
      "sup_1",
      {
        date: "2026-07-24",
        product_name: "  新マルチビタミン  ",
        amounts: [{ nutrient_code: "zinc_mg", amount: 8 }],
      },
      persist,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.supplement.supplement_id).toBe("sup_1");
      expect(result.supplement.date).toBe("2026-07-24");
      expect(result.supplement.recorded_at).toBe("2026-07-24T00:00:00.000Z");
      expect(result.supplement.product_name).toBe("新マルチビタミン");
      expect(result.supplement.amounts).toEqual([
        { nutrient_code: "zinc_mg", amount: 8 },
      ]);
    }
  });

  it("returns 404 for an unknown id", async () => {
    const result = await updateSupplement(
      "sup_missing",
      {
        date: "2026-07-24",
        product_name: "x",
        amounts: [{ nutrient_code: "iron_mg", amount: 5 }],
      },
      persist,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem.status).toBe(404);
    }
  });

  it("rejects invalid input with field codes only (never the product name)", async () => {
    const result = await updateSupplement(
      "sup_1",
      {
        date: "bad",
        product_name: "SECRET_BRAND_NAME",
        amounts: [],
      },
      persist,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const serialized = JSON.stringify(result.problem);
      expect(serialized).toContain("invalid_date");
      expect(serialized).not.toContain("SECRET_BRAND_NAME");
    }
  });
});
