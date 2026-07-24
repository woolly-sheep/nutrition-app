import { describe, expect, it } from "vitest";
import {
  buildDailyHeadline,
  type HeadlineInput,
} from "../../../src/domain/analysis/summaryHeadline";

const base: HeadlineInput = {
  comparableCount: 22,
  atLeast80Count: 18,
  topShortfallName: null,
  ulReachedNames: [],
  dgOverNames: [],
};

describe("buildDailyHeadline", () => {
  it("opens with a positive tone when most items are in range", () => {
    const line = buildDailyHeadline({ ...base, atLeast80Count: 20 });
    expect(line).toContain("おおむね順調");
    expect(line).toContain("22項目中20項目が目安圏内");
  });

  it("uses a middling tone around half", () => {
    const line = buildDailyHeadline({ ...base, atLeast80Count: 12 });
    expect(line).toContain("まずまず");
  });

  it("uses a shortfall-leaning tone when few items are in range", () => {
    const line = buildDailyHeadline({ ...base, atLeast80Count: 4 });
    expect(line).toContain("届かない項目が多め");
  });

  it("names the top shortfall when present", () => {
    const line = buildDailyHeadline({ ...base, topShortfallName: "鉄" });
    expect(line).toContain("鉄があと少しで届きそう");
  });

  it("mentions the first watch item (UL/DG) without asserting harm", () => {
    const line = buildDailyHeadline({ ...base, ulReachedNames: ["ナトリウム"] });
    expect(line).toContain("ナトリウムは目安を上回る推定");
    // safe wording: no medical/断定/warning phrasing
    expect(line).not.toMatch(/危険|注意してください|過剰摂取です|病気/);
  });

  it("handles a day with no comparable items", () => {
    const line = buildDailyHeadline({ ...base, comparableCount: 0, atLeast80Count: 0 });
    expect(line).toContain("比較できる項目がまだ少なめ");
  });

  it("keeps every branch in estimate wording", () => {
    for (const atLeast80Count of [0, 11, 22]) {
      const line = buildDailyHeadline({ ...base, atLeast80Count });
      expect(line).toContain("推定");
    }
  });
});
