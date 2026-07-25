import { describe, expect, it } from "vitest";
import { listRecipeViews } from "../../../src/server/api/handlers/listRecipes";
import { loadSeed } from "../../../src/seed/loadSeed";
import type { Recipe } from "../../../src/server/api/schemas/recipes";

const seed = loadSeed();

const recipe: Recipe = {
  recipe_id: "rec_1",
  name: "たまごごはん",
  items: [{ food_id: "food_egg_raw_001", intake_g: 50 }],
  created_at: "2026-07-25T00:00:00.000Z",
};

describe("listRecipeViews", () => {
  it("enriches items with a seed display name and a recipe kcal estimate", async () => {
    const [view] = await listRecipeViews(seed, async () => [recipe]);
    expect(view.recipe_id).toBe("rec_1");
    expect(view.items[0].food_id).toBe("food_egg_raw_001");
    // display name is resolved from the seed, not the stored recipe
    expect(view.items[0].display_name).not.toBe("food_egg_raw_001");
    expect(view.items[0].display_name.length).toBeGreaterThan(0);
    // energy is computed from the seed (egg has a positive kcal value)
    expect(view.estimated_kcal).not.toBeNull();
    expect(view.estimated_kcal ?? 0).toBeGreaterThan(0);
    // per-item kcal is also filled so the draft total is accurate
    expect(view.items[0].estimated_kcal ?? 0).toBeGreaterThan(0);
  });

  it("returns an empty list when there are no recipes", async () => {
    const views = await listRecipeViews(seed, async () => []);
    expect(views).toEqual([]);
  });
});
