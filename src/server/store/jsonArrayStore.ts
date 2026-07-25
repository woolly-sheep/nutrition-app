import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Durable JSON-array persistence shared by the local stores (meals,
 * supplements, supplement products, recipes). Two guarantees prevent the
 * silent data loss that plain readFile/writeFile allowed:
 *
 *  1. Reads NEVER coerce a corrupt file into an empty array. A missing or
 *     empty file is a legitimate empty list; a present-but-unparsable file
 *     THROWS. This matters because every mutation is read → modify → write:
 *     if a bad read returned [], the next write would overwrite good data
 *     with nothing. Throwing aborts the mutation and leaves the file intact.
 *
 *  2. Writes are atomic (write to a temp file, then rename). A crash or a
 *     dev-server reload mid-write can no longer truncate the real file to a
 *     partial/empty state (which would then read as corrupt → mutation
 *     aborts, per rule 1). Never log the contents (logging allowlist).
 */

export async function readJsonArray<T>(file: string): Promise<T[]> {
  let raw: string;
  try {
    raw = await readFile(file, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
  if (raw.trim() === "") {
    return [];
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`data file is not a JSON array: ${file}`);
  }
  return parsed as T[];
}

export async function writeJsonArray<T>(
  file: string,
  records: readonly T[],
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  // A pid-scoped temp file keeps concurrent writers from clobbering each
  // other's temp; rename is atomic on the same filesystem.
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(records, null, 2), "utf-8");
  await rename(tmp, file);
}

/** Atomic write for a single JSON object (profile). */
export async function writeJsonObject<T>(
  file: string,
  value: T,
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf-8");
  await rename(tmp, file);
}
