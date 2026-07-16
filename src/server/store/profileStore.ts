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
  await mkdir(dataDir(), { recursive: true });
  await writeFile(
    profileFile(),
    JSON.stringify({ sex: profile.sex, ageBand: profile.ageBand }, null, 2),
    "utf-8",
  );
}
