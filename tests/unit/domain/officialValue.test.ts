import { describe, expect, it } from "vitest";
import { parseOfficialValue } from "../../../src/domain/reference/officialValue";

describe("parseOfficialValue", () => {
  it("parses plain numbers as exact", () => {
    expect(parseOfficialValue(650)).toEqual({ kind: "exact", value: 650 });
    expect(parseOfficialValue(0.9)).toEqual({ kind: "exact", value: 0.9 });
  });

  it("parses range notation", () => {
    expect(parseOfficialValue("13-20")).toEqual({
      kind: "range",
      min: 13,
      max: 20,
    });
    expect(parseOfficialValue("50-65")).toEqual({
      kind: "range",
      min: 50,
      max: 65,
    });
  });

  it("parses 以上 / 未満 thresholds", () => {
    expect(parseOfficialValue("22以上")).toEqual({ kind: "at_least", min: 22 });
    expect(parseOfficialValue("7.5未満")).toEqual({
      kind: "less_than",
      max: 7.5,
    });
  });

  it("classifies menstruation-dependent values as conditional", () => {
    expect(parseOfficialValue("6.0 no_menses / 10.0 menses")).toEqual({
      kind: "conditional",
      raw: "6.0 no_menses / 10.0 menses",
    });
  });

  it("classifies not_established", () => {
    expect(parseOfficialValue("not_established")).toEqual({
      kind: "not_established",
    });
  });

  it("never coerces unknown notations", () => {
    expect(parseOfficialValue("約20")).toEqual({
      kind: "unparsable",
      raw: "約20",
    });
    expect(parseOfficialValue(null)).toEqual({
      kind: "unparsable",
      raw: "null",
    });
  });
});
