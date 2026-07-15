import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgeBand, Sex } from "../../domain/reference/types";

/**
 * MVP persistence for the local reference-demographic setting
 * (data/profile.json). Single-user, no auth — same lifecycle as mealStore.
 */

export type StoredProfile = {
  sex: Sex;
  ageBand: AgeBand;
};

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILE_FILE = path.join(DATA_DIR, "profile.json");

export async function readProfile(): Promise<StoredProfile | null> {
  try {
    const raw = await readFile(PROFILE_FILE, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const { sex, ageBand } = parsed as Record<string, unknown>;
    if (typeof sex !== "string" || typeof ageBand !== "string") {
      return null;
    }
    return { sex, ageBand } as StoredProfile;
  } catch {
    return null;
  }
}

export async function writeProfile(profile: StoredProfile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    PROFILE_FILE,
    JSON.stringify({ sex: profile.sex, ageBand: profile.ageBand }, null, 2),
    "utf-8",
  );
}
