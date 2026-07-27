import { describe, expect, it, vi } from "vitest";
import { updateSupplementProduct } from "../../../src/server/api/handlers/updateSupplementProduct";
import type { SupplementProduct } from "../../../src/server/api/schemas/supplementProducts";

const existing: SupplementProduct = {
  product_id: "sprod_1",
  name: "エビオス錠",
  serving_count: 10,
  serving_unit: "錠",
  amounts: [{ nutrient_code: "vitamin_b1_mg", amount: 0.6 }],
  created_at: "2026-07-24T00:00:00.000Z",
};

const validBody = {
  name: "  エビオス錠(改)  ",
  serving_count: 30,
  serving_unit: "錠",
  amounts: [{ nutrient_code: "vitamin_b1_mg", amount: 1.8 }],
};

describe("updateSupplementProduct", () => {
  it("updates a valid product, trims the name, keeps id/created_at", async () => {
    const persist = vi.fn(async (id: string, input) => ({
      ...existing,
      product_id: id,
      name: input.name,
      serving_count: input.serving_count,
      serving_unit: input.serving_unit,
      amounts: input.amounts,
    }));
    const result = await updateSupplementProduct("sprod_1", validBody, persist);
    expect(result.ok).toBe(true);
    expect(persist).toHaveBeenCalledWith("sprod_1", {
      name: "エビオス錠(改)",
      serving_count: 30,
      serving_unit: "錠",
      amounts: [{ nutrient_code: "vitamin_b1_mg", amount: 1.8 }],
    });
    if (result.ok) {
      expect(result.product.product_id).toBe("sprod_1");
      expect(result.product.created_at).toBe("2026-07-24T00:00:00.000Z");
      expect(result.product.serving_count).toBe(30);
    }
  });

  it("returns 404 when the id is unknown (persist → null)", async () => {
    const persist = vi.fn(async () => null);
    const result = await updateSupplementProduct("nope", validBody, persist);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem.status).toBe(404);
    }
  });

  it("rejects an invalid body without persisting (codes only)", async () => {
    const persist = vi.fn(async () => existing);
    const result = await updateSupplementProduct(
      "sprod_1",
      { ...validBody, name: "   ", amounts: [] },
      persist,
    );
    expect(result.ok).toBe(false);
    expect(persist).not.toHaveBeenCalled();
    if (!result.ok) {
      const serialized = JSON.stringify(result.problem);
      expect(serialized).toContain("invalid_name");
      expect(serialized).toContain("invalid_amounts");
      expect(serialized).not.toContain("エビオス");
    }
  });
});
