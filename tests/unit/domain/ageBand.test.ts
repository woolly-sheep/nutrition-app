import { describe, expect, it } from "vitest";
import { ageOn, isValidBirthDate, resolveAgeBand } from "../../../src/domain/reference/ageBand";

describe("ageOn", () => {
  it("counts completed years, not calendar-year differences", () => {
    expect(ageOn("1990-07-25", "2026-07-24")).toBe(35);
    expect(ageOn("1990-07-24", "2026-07-24")).toBe(36);
  });

  it("handles a leap-day birth date", () => {
    expect(ageOn("2000-02-29", "2026-02-28")).toBe(25);
    expect(ageOn("2000-02-29", "2026-03-01")).toBe(26);
  });
});

describe("resolveAgeBand", () => {
  it("maps each DRI 2025 adult band", () => {
    const cases: [string, string][] = [
      ["2008-01-01", "adult_18_29"],
      ["1996-01-01", "adult_30_49"],
      ["1976-01-01", "adult_50_64"],
      ["1961-01-01", "adult_65_74"],
      ["1950-01-01", "adult_75_plus"],
    ];
    for (const [birthDate, expected] of cases) {
      const resolution = resolveAgeBand(birthDate, "2026-07-24");
      expect(resolution.ok && resolution.ageBand).toBe(expected);
    }
  });

  it("switches band on the boundary birthday, not before", () => {
    expect(resolveAgeBand("1996-07-25", "2026-07-24")).toMatchObject({
      ageBand: "adult_18_29",
    });
    expect(resolveAgeBand("1996-07-25", "2026-07-25")).toMatchObject({
      ageBand: "adult_30_49",
    });
  });

  it("refuses to compare below 18 instead of using the nearest band", () => {
    const resolution = resolveAgeBand("2010-01-01", "2026-07-24");
    expect(resolution.ok).toBe(false);
    expect(resolution.ok === false && resolution.reason).toBe("under_18");
  });

  it("resolves against the evaluated date so past days keep their band", () => {
    // Turned 30 on 2026-07-01: a June day is still compared as 18–29.
    expect(resolveAgeBand("1996-07-01", "2026-06-30")).toMatchObject({
      ageBand: "adult_18_29",
    });
    expect(resolveAgeBand("1996-07-01", "2026-07-01")).toMatchObject({
      ageBand: "adult_30_49",
    });
  });
});

describe("isValidBirthDate", () => {
  it("rejects malformed and impossible dates", () => {
    expect(isValidBirthDate("1990-05-20")).toBe(true);
    expect(isValidBirthDate("1990-02-30")).toBe(false);
    expect(isValidBirthDate("1990-13-01")).toBe(false);
    expect(isValidBirthDate("1990/05/20")).toBe(false);
    expect(isValidBirthDate(19900520)).toBe(false);
    expect(isValidBirthDate(undefined)).toBe(false);
  });
});
