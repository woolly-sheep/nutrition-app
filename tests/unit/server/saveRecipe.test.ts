import { describe, expect, it } from "vitest";
import { saveRecipe } from "../../../src/server/api/handlers/saveRecipe";
import { loadSeed } from "../../../src/seed/loadSeed";
import type { CreateRecipeRequest, Recipe } from "../../../src/server/api/schemas/recipes";

const seed = loadSeed();

const persist = async (input: CreateRecipeRequest): Promise<Recipe> => ({
  ...input,
  recipe_id: "rec_test",
  created_at: "2026-07-25T00:00:00.000Z",
});

describe("saveRecipe", () => {
  it("saves a valid recipe and trims the name", async () => {
    const result = await saveRecipe(
      {
        name: "  いつもの朝食  ",
        items: [{ food_id: "food_egg_raw_001", intake_g: 50 }],
      },
      seed,
      persist,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recipe.name).toBe("いつもの朝食");
      expect(result.recipe.items).toEqual([
        { food_id: "food_egg_raw_001", intake_g: 50 },
      ]);
    }
  });

  it("rejects an unknown food and a blank name with codes only", async () => {
    const result = await saveRecipe(
      {
        name: "SECRET_DISH",
        items: [{ food_id: "nope", intake_g: 50 }],
      },
      seed,
      persist,
    );
    // name is present here, so only the item is invalid — flip to blank name:
    const blank = await saveRecipe(
      { name: "   ", items: [{ food_id: "nope", intake_g: 50 }] },
      seed,
      persist,
    );
    expect(result.ok).toBe(false);
    expect(blank.ok).toBe(false);
    if (!blank.ok) {
      const serialized = JSON.stringify(blank.problem);
      expect(serialized).toContain("invalid_name");
      expect(serialized).toContain("unknown_food");
    }
  });

  it("rejects empty items", async () => {
    const result = await saveRecipe(
      { name: "x", items: [] },
      seed,
      persist,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(JSON.stringify(result.problem)).toContain("empty_items");
    }
  });

  it("never echoes the dish name into errors", async () => {
    const result = await saveRecipe(
      { name: "", items: [{ food_id: "nope", intake_g: 50 }] },
      seed,
      persist,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(JSON.stringify(result.problem)).not.toContain("SECRET_DISH");
    }
  });
});
