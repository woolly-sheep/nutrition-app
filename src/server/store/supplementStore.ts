import { randomUUID } from "node:crypto";
import path from "node:path";
import type {
  CreateSupplementRequest,
  SupplementRecord,
} from "../api/schemas/supplements";
import { readJsonArray, writeJsonArray } from "./jsonArrayStore";

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
  return readJsonArray<SupplementRecord>(supplementsFile());
}

async function writeAll(records: readonly SupplementRecord[]): Promise<void> {
  await writeJsonArray(supplementsFile(), records);
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

/**
 * Replaces one record's product name and amounts. supplement_id, date and
 * recorded_at stay untouched (the record keeps its original day and identity,
 * same policy as editing a meal). Returns null when the id is unknown.
 */
export async function updateSupplementRecord(
  id: string,
  input: Pick<CreateSupplementRequest, "product_name" | "amounts">,
): Promise<SupplementRecord | null> {
  const records = await readAll();
  const index = records.findIndex((r) => r.supplement_id === id);
  if (index === -1) {
    return null;
  }
  const updated: SupplementRecord = {
    ...records[index],
    product_name: input.product_name,
    amounts: input.amounts,
  };
  const next = [...records];
  next[index] = updated;
  await writeAll(next);
  return updated;
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
