import type { AgeBand, Sex } from "../../../domain/reference/types";
import {
  writeProfile,
  type StoredProfile,
} from "../../store/profileStore";
import type { ProblemDetails } from "../errors/problem";
import { validationProblem } from "../errors/problem";
import { AGE_BANDS, SEXES } from "../schemas/profile";

export type SaveProfileResult =
  | { ok: true; profile: StoredProfile }
  | { ok: false; problem: ProblemDetails };

export async function saveProfile(
  body: unknown,
  persist: (profile: StoredProfile) => Promise<void> = writeProfile,
): Promise<SaveProfileResult> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, problem: validationProblem(["invalid_body"]) };
  }

  const { sex, ageBand } = body as Record<string, unknown>;
  const errors: string[] = [];
  if (!SEXES.includes(sex as Sex)) {
    errors.push("invalid_sex");
  }
  if (!AGE_BANDS.includes(ageBand as AgeBand)) {
    errors.push("invalid_age_band");
  }
  if (errors.length > 0) {
    return { ok: false, problem: validationProblem(errors) };
  }

  const profile: StoredProfile = {
    sex: sex as Sex,
    ageBand: ageBand as AgeBand,
  };
  await persist(profile);
  return { ok: true, profile };
}
