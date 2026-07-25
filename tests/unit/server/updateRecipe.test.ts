import { describe, expect, it } from "vitest";
import { updateRecipe } from "../../../src/server/api/handlers/updateRecipe";
import { loadSeed } from "../../../src/seed/loadSeed";
import type { CreateRecipeRequest, Recipe } from "../../../src/server/api/schemas/recipes";

const seed = loadSeed();

const existing: Recipe = {
  recipe_id: "rec_1",
  name: "旧・朝食セット",
  items: [{ food_id: "food_egg_raw_001", intake_g: 50 }],
  created_at: "2026-07-25T00:00:00.000Z",
};

const persist = async (
  id: string,
  input: CreateRecipeRequest,
): Promise<Recipe | null> =>
  id === existing.recipe_id
    ? { ...existing, name: input.name, items: input.items }
    : null;

describe("updateRecipe", () => {
  it("replaces name and items but keeps id and created_at", async () => {
    const result = await updateRecipe(
      "rec_1",
      {
        name: "  新・朝食セット  ",
        items: [{ food_id: "food_nattoo_001", intake_g: 40 }],
      },
      seed,
      persist,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recipe.recipe_id).toBe("rec_1");
      expect(result.recipe.created_at).toBe("2026-07-25T00:00:00.000Z");
      expect(result.recipe.name).toBe("新・朝食セット");
      expect(result.recipe.items).toEqual([
        { food_id: "food_nattoo_001", intake_g: 40 },
      ]);
    }
  });

  it("returns 404 for an unknown id", async () => {
    const result = await updateRecipe(
      "rec_missing",
      { name: "x", items: [{ food_id: "food_egg_raw_001", intake_g: 10 }] },
      seed,
      persist,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem.status).toBe(404);
    }
  });

  it("rejects an unknown food and blank name with codes only (never the name)", async () => {
    const result = await updateRecipe(
      "rec_1",
      { name: "", items: [{ food_id: "nope", intake_g: 10 }] },
      seed,
      persist,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const serialized = JSON.stringify(result.problem);
      expect(serialized).toContain("invalid_name");
      expect(serialized).toContain("unknown_food");
    }
  });
});
