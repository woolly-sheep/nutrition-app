import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CreateSupplementRequest,
  SupplementRecord,
} from "../api/schemas/supplements";

/**
 * MVP persistence for self-reported supplements (data/supplements.json).
 * Same lifecycle as mealStore: single-user, local, gitignored, never
 * logged. Kept in a separate file from meals so the two intake sources are
 * never accidentally merged.
 */

function dataDir(): string {
  return process.env.NUTRITION_DATA_DIR ?? path.join(process.cwd(), "data");
}

function supplementsFile(): string {
  return path.join(dataDir(), "supplements.json");
}

async function readAll(): Promise<SupplementRecord[]> {
  try {
    const raw = await readFile(supplementsFile(), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SupplementRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(records: readonly SupplementRecord[]): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(
    supplementsFile(),
    JSON.stringify(records, null, 2),
    "utf-8",
  );
}

export async function listSupplements(
  date?: string,
): Promise<SupplementRecord[]> {
  const records = await readAll();
  return date ? records.filter((r) => r.date === date) : records;
}

export async function appendSupplement(
  input: CreateSupplementRequest,
): Promise<SupplementRecord> {
  const record: SupplementRecord = {
    ...input,
    supplement_id: `sup_${randomUUID()}`,
    recorded_at: new Date().toISOString(),
  };
  const records = await readAll();
  await writeAll([...records, record]);
  return record;
}

/** Returns true when a record was removed, false when the id was unknown. */
export async function deleteSupplement(id: string): Promise<boolean> {
  const records = await readAll();
  const next = records.filter((r) => r.supplement_id !== id);
  if (next.length === records.length) {
    return false;
  }
  await writeAll(next);
  return true;
}

export async function replaceAllSupplements(
  records: readonly SupplementRecord[],
): Promise<void> {
  await writeAll(records);
}
