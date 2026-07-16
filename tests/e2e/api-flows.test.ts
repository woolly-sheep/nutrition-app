import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * End-to-end API flows through the real route handlers (route.ts →
 * handlers → domain → stores), against an isolated temp data directory
 * (NUTRITION_DATA_DIR). Covers the user journey: onboarding → record →
 * daily summary → weekly report → shortcuts.
 */

import * as analysisRoute from "../../src/app/api/analysis/route";
import * as candidatesRoute from "../../src/app/api/analysis/candidates/route";
import * as foodsRoute from "../../src/app/api/foods/route";
import * as mealsRoute from "../../src/app/api/meals/route";
import * as usualRoute from "../../src/app/api/meals/usual/route";
import * as profileRoute from "../../src/app/api/profile/route";

let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), "nutrition-e2e-"));
  process.env.NUTRITION_DATA_DIR = tempDir;
});

afterAll(() => {
  delete process.env.NUTRITION_DATA_DIR;
  rmSync(tempDir, { recursive: true, force: true });
});

function get(url: string) {
  return new Request(`http://localhost:3000${url}`);
}

function post(url: string, body: unknown) {
  return new Request(`http://localhost:3000${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function put(url: string, body: unknown) {
  return new Request(`http://localhost:3000${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API flows (e2e through route handlers)", () => {
  it("starts with no profile and requires it for analysis", async () => {
    const profile = await (await profileRoute.GET()).json();
    expect(profile.profile).toBeNull();

    const analysis = await (
      await analysisRoute.GET(get("/api/analysis?date=2026-07-16"))
    ).json();
    expect(analysis.profile_required).toBe(true);

    const candidates = await (
      await candidatesRoute.GET(get("/api/analysis/candidates?date=2026-07-16"))
    ).json();
    expect(candidates.has_analysis).toBe(false);
  });

  it("rejects an invalid profile and accepts a valid one", async () => {
    const invalid = await profileRoute.PUT(
      put("/api/profile", { sex: "other", ageBand: "child" }),
    );
    expect(invalid.status).toBe(422);
    const problem = await invalid.json();
    expect(problem.errors).toContain("invalid_sex");
    expect(problem.errors).toContain("invalid_age_band");

    const valid = await profileRoute.PUT(
      put("/api/profile", { sex: "male", ageBand: "adult_30_49" }),
    );
    expect(valid.status).toBe(200);
    const saved = await (await profileRoute.GET()).json();
    expect(saved.profile).toEqual({ sex: "male", ageBand: "adult_30_49" });
  });

  it("searches foods and returns empty results as 200 with a message", async () => {
    const hit = await (await foodsRoute.GET(get("/api/foods?q=ごはん"))).json();
    expect(hit.foods.length).toBeGreaterThan(0);

    const miss = await (
      await foodsRoute.GET(get("/api/foods?q=存在しないXYZ"))
    ).json();
    expect(miss.foods).toHaveLength(0);
    expect(miss.message).toBeTruthy();
  });

  it("rejects invalid meals and saves valid ones", async () => {
    const invalid = await mealsRoute.POST(
      post("/api/meals", {
        date: "2026-07-16",
        meal_type: "dinner",
        items: [{ food_id: "food_rice_cooked_white_001", intake_g: -5 }],
      }),
    );
    expect(invalid.status).toBe(422);

    for (const [date, mealType, foodId, grams] of [
      ["2026-07-15", "dinner", "food_rice_cooked_white_001", 150],
      ["2026-07-16", "dinner", "food_rice_cooked_white_001", 180],
      ["2026-07-16", "dinner", "food_kiwi_raw_001", 160],
    ] as const) {
      const response = await mealsRoute.POST(
        post("/api/meals", {
          date,
          meal_type: mealType,
          items: [{ food_id: foodId, intake_g: grams }],
        }),
      );
      expect(response.status).toBe(201);
    }

    const list = await (
      await mealsRoute.GET(get("/api/meals?date=2026-07-16"))
    ).json();
    expect(list.meals).toHaveLength(2);
  });

  it("produces the daily summary from the saved records", async () => {
    const analysis = await (
      await analysisRoute.GET(get("/api/analysis?date=2026-07-16"))
    ).json();
    expect(analysis.has_records).toBe(true);
    expect(analysis.summary.comparable_count).toBeGreaterThan(0);
    expect(analysis.disclaimer).toContain("推定値");

    const vitaminC = [
      ...analysis.summary.achieved,
      ...analysis.summary.insufficient,
    ].find((item: { nutrient_code: string }) => item.nutrient_code === "vitamin_c_mg");
    // kiwi 160g × 71mg/100g = 113.6mg ≥ RDA 100mg → achieved
    expect(analysis.summary.achieved).toContainEqual(vitaminC);
  });

  it("produces the weekly report excluding unrecorded days", async () => {
    const weekly = await (
      await analysisRoute.GET(get("/api/analysis?date=2026-07-16&period=weekly"))
    ).json();
    expect(weekly.recorded_dates).toEqual(["2026-07-15", "2026-07-16"]);
    expect(weekly.missing_dates).toEqual(["2026-07-13", "2026-07-14"]);
    expect(weekly.nutrients.length).toBeGreaterThan(0);
  });

  it("derives usual foods and analysis-linked candidates", async () => {
    const usual = await (
      await usualRoute.GET(get("/api/meals/usual?meal_type=dinner&date=2026-07-16"))
    ).json();
    expect(
      usual.items.map((item: { food_id: string }) => item.food_id),
    ).toContain("food_rice_cooked_white_001");

    const candidates = await (
      await candidatesRoute.GET(get("/api/analysis/candidates?date=2026-07-16"))
    ).json();
    expect(candidates.has_analysis).toBe(true);
    expect(candidates.candidates.length).toBeGreaterThan(0);
    expect(candidates.notice).toContain("摂取の推奨ではありません");
  });

  it("rejects malformed dates across analysis endpoints", async () => {
    for (const url of [
      "/api/analysis?date=16-07-2026",
      "/api/analysis/candidates?date=bad",
      "/api/meals/usual?meal_type=dinner&date=bad",
    ]) {
      const routeModule = url.includes("candidates")
        ? candidatesRoute
        : url.includes("usual")
          ? usualRoute
          : analysisRoute;
      const response = await routeModule.GET(get(url));
      expect(response.status).toBe(422);
    }
  });
});
