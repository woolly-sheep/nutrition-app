import { describe, expect, it } from "vitest";
import { saveProfile } from "../../../src/server/api/handlers/saveProfile";
import { resolveProfileForDate } from "../../../src/server/api/profileResolution";
import type { StoredProfile } from "../../../src/server/store/profileStore";

describe("resolveProfileForDate", () => {
  it("derives the band from the birth date on the evaluated date", () => {
    const stored: StoredProfile = { sex: "male", birthDate: "1976-08-02" };
    expect(resolveProfileForDate(stored, "2026-08-01")).toEqual({
      ok: true,
      profile: { sex: "male", ageBand: "adult_30_49" },
    });
    expect(resolveProfileForDate(stored, "2026-08-02")).toEqual({
      ok: true,
      profile: { sex: "male", ageBand: "adult_50_64" },
    });
  });

  it("keeps using the fixed band of a pre-birthdate profile", () => {
    const legacy: StoredProfile = { sex: "female", ageBand: "adult_65_74" };
    expect(resolveProfileForDate(legacy, "2026-07-24")).toEqual({
      ok: true,
      profile: { sex: "female", ageBand: "adult_65_74" },
    });
  });

  it("reports unsupported instead of falling back to a nearby band", () => {
    const stored: StoredProfile = { sex: "female", birthDate: "2015-01-01" };
    expect(resolveProfileForDate(stored, "2026-07-24")).toEqual({
      ok: false,
      reason: "unsupported_age",
    });
  });
});

describe("saveProfile", () => {
  const persist = async () => {};

  it("stores the birth date and no age band", async () => {
    const result = await saveProfile(
      { sex: "male", birthDate: "1990-05-20" },
      persist,
      "2026-07-24",
    );
    expect(result).toEqual({
      ok: true,
      profile: { sex: "male", birthDate: "1990-05-20" },
    });
  });

  it("rejects an age outside the seeded adult tables", async () => {
    const young = await saveProfile(
      { sex: "male", birthDate: "2012-01-01" },
      persist,
      "2026-07-24",
    );
    expect(young.ok).toBe(false);
    expect(young.ok === false && young.problem.errors).toContain(
      "age_below_supported_range",
    );

    const old = await saveProfile(
      { sex: "female", birthDate: "1880-01-01" },
      persist,
      "2026-07-24",
    );
    expect(old.ok === false && old.problem.errors).toContain(
      "age_above_supported_range",
    );
  });

  it("reports field codes only, never the submitted value", async () => {
    const result = await saveProfile(
      { sex: "other", birthDate: "1990-02-31" },
      persist,
      "2026-07-24",
    );
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).toContain("invalid_sex");
    expect(serialized).toContain("invalid_birth_date");
    expect(serialized).not.toContain("1990-02-31");
  });
});
