import { describe, expect, it } from "vitest";
import {
  buildNutrientBarGroups,
  buildStatusTally,
} from "../../../src/domain/analysis/nutrientStatusGroups";

const item = (nutrient_code: string, percent_of_reference: number) => ({
  nutrient_code,
  percent_of_reference,
});

describe("buildNutrientBarGroups", () => {
  it("orders short → near → achieved and puts the shortest first", () => {
    const groups = buildNutrientBarGroups({
      achieved: [item("vitK", 272)],
      insufficient: [item("calcium", 34), item("vitB1", 33), item("copper", 88)],
    });
    expect(groups.map((g) => g.status)).toEqual(["short", "near", "achieved"]);
    // 不足を優先: <80%, ascending percent (most short first)
    expect(groups[0].items.map((i) => i.nutrient_code)).toEqual([
      "vitB1",
      "calcium",
    ]);
    // 目安圏内: 80–100%
    expect(groups[1].items.map((i) => i.nutrient_code)).toEqual(["copper"]);
    // 達成: passed through
    expect(groups[2].items.map((i) => i.nutrient_code)).toEqual(["vitK"]);
  });

  it("treats exactly 80% as 目安圏内, not 不足", () => {
    const groups = buildNutrientBarGroups({
      achieved: [],
      insufficient: [item("x", 80), item("y", 79.9)],
    });
    expect(groups.map((g) => g.status)).toEqual(["short", "near"]);
    expect(groups[0].items.map((i) => i.nutrient_code)).toEqual(["y"]);
    expect(groups[1].items.map((i) => i.nutrient_code)).toEqual(["x"]);
  });

  it("omits empty groups", () => {
    const groups = buildNutrientBarGroups({
      achieved: [item("a", 120)],
      insufficient: [],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].status).toBe("achieved");
  });

  it("defaults a missing percent to 0 (treated as short)", () => {
    const groups = buildNutrientBarGroups<{
      nutrient_code: string;
      percent_of_reference?: number;
    }>({
      achieved: [],
      insufficient: [{ nutrient_code: "z" }],
    });
    expect(groups[0].status).toBe("short");
  });
});

describe("buildStatusTally", () => {
  it("splits the comparable set around 80% and sums attention rows", () => {
    const tally = buildStatusTally({
      comparableCount: 19,
      atLeast80Count: 8,
      achievedCount: 6,
      ulReachedCount: 0,
      dgOverCount: 1, // 脂質
    });
    expect(tally).toEqual({
      achieved: 6,
      near: 2, // 8 - 6
      short: 11, // 19 - 8
      attention: 1,
    });
  });

  it("never returns negative counts", () => {
    const tally = buildStatusTally({
      comparableCount: 0,
      atLeast80Count: 0,
      achievedCount: 0,
      ulReachedCount: 0,
      dgOverCount: 0,
    });
    expect(tally).toEqual({ achieved: 0, near: 0, short: 0, attention: 0 });
  });
});
