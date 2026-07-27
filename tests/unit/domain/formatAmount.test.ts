import { describe, expect, it } from "vitest";
import { formatAmount } from "../../../src/domain/format/amount";

describe("formatAmount (#77 adaptive precision)", () => {
  it("rounds figures of 100+ to whole numbers", () => {
    expect(formatAmount(669.4)).toBe("669");
    expect(formatAmount(227.9)).toBe("228");
    expect(formatAmount(1678)).toBe("1678");
    expect(formatAmount(152.1)).toBe("152");
  });

  it("keeps one decimal between 1 and 100", () => {
    expect(formatAmount(8.5)).toBe("8.5");
    expect(formatAmount(80.6)).toBe("80.6");
    expect(formatAmount(26.6)).toBe("26.6");
  });

  it("keeps two decimals below 1 and drops trailing zeros", () => {
    expect(formatAmount(0.6)).toBe("0.6");
    expect(formatAmount(0.25)).toBe("0.25");
  });

  it("formats whole numbers and zero without decimals", () => {
    expect(formatAmount(500)).toBe("500");
    expect(formatAmount(1)).toBe("1");
    expect(formatAmount(0)).toBe("0");
  });
});
