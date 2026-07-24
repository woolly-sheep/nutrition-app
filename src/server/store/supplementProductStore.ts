import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CreateSupplementProductRequest,
  SupplementProduct,
} from "../api/schemas/supplementProducts";

/**
 * MVP persistence for supplement product presets
 * (data/supplement-products.json). Same lifecycle as the other stores:
 * single-user, local, gitignored, never logged.
 */

function dataDir(): string {
  return process.env.NUTRITION_DATA_DIR ?? path.join(process.cwd(), "data");
}

function productsFile(): string {
  return path.join(dataDir(), "supplement-products.json");
}

async function readAll(): Promise<SupplementProduct[]> {
  try {
    const raw = await readFile(productsFile(), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SupplementProduct[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(records: readonly SupplementProduct[]): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(productsFile(), JSON.stringify(records, null, 2), "utf-8");
}

export async function listSupplementProducts(): Promise<SupplementProduct[]> {
  return readAll();
}

export async function appendSupplementProduct(
  input: CreateSupplementProductRequest,
): Promise<SupplementProduct> {
  const product: SupplementProduct = {
    ...input,
    product_id: `sprod_${randomUUID()}`,
    created_at: new Date().toISOString(),
  };
  const records = await readAll();
  await writeAll([...records, product]);
  return product;
}

export async function deleteSupplementProduct(id: string): Promise<boolean> {
  const records = await readAll();
  const next = records.filter((r) => r.product_id !== id);
  if (next.length === records.length) {
    return false;
  }
  await writeAll(next);
  return true;
}

export async function replaceAllSupplementProducts(
  records: readonly SupplementProduct[],
): Promise<void> {
  await writeAll(records);
}
