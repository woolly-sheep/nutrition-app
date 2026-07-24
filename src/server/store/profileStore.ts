import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidBirthDate } from "../../domain/reference/ageBand";
import type { AgeBand, Sex } from "../../domain/reference/types";

/**
 * MVP persistence for the local reference-demographic setting
 * (data/profile.json). Single-user, no auth — same lifecycle as mealStore.
 *
 * birthDate is the stored source of truth; the age band is derived per
 * evaluated date (decision-20260724-birthdate-profile). Profiles written
 * before that change hold a fixed ageBand and are still readable — the
 * legacy band is used as-is until the birth date is entered.
 */

export type StoredProfile = {
  sex: Sex;
  /** ISO YYYY-MM-DD. Absent only for pre-birthdate legacy profiles. */
  birthDate?: string;
  /** Legacy fixed band. Ignored when birthDate is present. */
  ageBand?: AgeBand;
};

/** Resolved per call so tests can point NUTRITION_DATA_DIR at a temp dir. */
function dataDir(): string {
  return process.env.NUTRITION_DATA_DIR ?? path.join(process.cwd(), "data");
}

function profileFile(): string {
  return path.join(dataDir(), "profile.json");
}

export async function readProfile(): Promise<StoredProfile | null> {
  try {
    const raw = await readFile(profileFile(), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const { sex, ageBand, birthDate } = parsed as Record<string, unknown>;
    if (typeof sex !== "string") {
      return null;
    }
    if (isValidBirthDate(birthDate)) {
      return { sex, birthDate } as StoredProfile;
    }
    if (typeof ageBand !== "string") {
      return null;
    }
    return { sex, ageBand } as StoredProfile;
  } catch {
    return null;
  }
}

export async function writeProfile(profile: StoredProfile): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  const payload: Record<string, string> = { sex: profile.sex };
  if (profile.birthDate) {
    payload.birthDate = profile.birthDate;
  } else if (profile.ageBand) {
    payload.ageBand = profile.ageBand;
  }
  await writeFile(profileFile(), JSON.stringify(payload, null, 2), "utf-8");
}
