import { ageOn, isValidBirthDate } from "../../../domain/reference/ageBand";
import type { Sex } from "../../../domain/reference/types";
import {
  writeProfile,
  type StoredProfile,
} from "../../store/profileStore";
import type { ProblemDetails } from "../errors/problem";
import { validationProblem } from "../errors/problem";
import {
  MAX_SUPPORTED_AGE,
  MIN_SUPPORTED_AGE,
  SEXES,
} from "../schemas/profile";

export type SaveProfileResult =
  | { ok: true; profile: StoredProfile }
  | { ok: false; problem: ProblemDetails };

/**
 * The stored demographic is birth date × sex; the age band is derived
 * later per evaluated date. Ages outside the DRI 2025 adult tables are
 * rejected here rather than silently compared against the nearest band
 * (decision-20260724-birthdate-profile).
 */
export async function saveProfile(
  body: unknown,
  persist: (profile: StoredProfile) => Promise<void> = writeProfile,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<SaveProfileResult> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, problem: validationProblem(["invalid_body"]) };
  }

  const { sex, birthDate } = body as Record<string, unknown>;
  const errors: string[] = [];
  if (!SEXES.includes(sex as Sex)) {
    errors.push("invalid_sex");
  }
  if (!isValidBirthDate(birthDate)) {
    errors.push("invalid_birth_date");
  } else {
    const age = ageOn(birthDate, today);
    if (age < MIN_SUPPORTED_AGE) {
      errors.push("age_below_supported_range");
    } else if (age > MAX_SUPPORTED_AGE) {
      errors.push("age_above_supported_range");
    }
  }
  if (errors.length > 0) {
    return { ok: false, problem: validationProblem(errors) };
  }

  const profile: StoredProfile = {
    sex: sex as Sex,
    birthDate: birthDate as string,
  };
  await persist(profile);
  return { ok: true, profile };
}
