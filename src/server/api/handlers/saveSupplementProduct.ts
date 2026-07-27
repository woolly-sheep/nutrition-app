import { appendSupplementProduct } from "../../store/supplementProductStore";
import type { ProblemDetails } from "../errors/problem";
import { validationProblem } from "../errors/problem";
import {
  SUPPLEMENT_NUTRIENT_CODES,
  type SupplementAmount,
} from "../schemas/supplements";
import type {
  CreateSupplementProductRequest,
  SupplementProduct,
} from "../schemas/supplementProducts";

export type SaveSupplementProductResult =
  | { ok: true; product: SupplementProduct }
  | { ok: false; problem: ProblemDetails };

const MAX_AMOUNTS = 30;
const MAX_AMOUNT = 100000;
const MAX_NAME_LEN = 100;
const MAX_SERVING = 1000;

/**
 * Validates and saves one product preset. Product name and serving unit are
 * user data, so validation errors return field codes only, never the values.
 */
export async function saveSupplementProduct(
  body: unknown,
  save: (
    input: CreateSupplementProductRequest,
  ) => Promise<SupplementProduct> = appendSupplementProduct,
): Promise<SaveSupplementProductResult> {
  const validated = validateSupplementProductBody(body);
  if (!validated.ok) {
    return validated;
  }
  const product = await save(validated.value);
  return { ok: true, product };
}

type ValidatedProduct =
  | { ok: true; value: CreateSupplementProductRequest }
  | { ok: false; problem: ProblemDetails };

/**
 * Shared validation for the create and edit paths. Product name and serving
 * unit are user data, so failures return field codes only, never the values.
 */
export function validateSupplementProductBody(body: unknown): ValidatedProduct {
  if (typeof body !== "object" || body === null) {
    return { ok: false, problem: validationProblem(["invalid_body"]) };
  }
  const { name, serving_count, serving_unit, amounts } = body as Record<
    string,
    unknown
  >;
  const errors: string[] = [];

  if (typeof name !== "string" || name.trim() === "" || name.length > MAX_NAME_LEN) {
    errors.push("invalid_name");
  }
  if (
    typeof serving_count !== "number" ||
    !Number.isFinite(serving_count) ||
    serving_count <= 0 ||
    serving_count > MAX_SERVING
  ) {
    errors.push("invalid_serving_count");
  }
  if (
    typeof serving_unit !== "string" ||
    serving_unit.trim() === "" ||
    serving_unit.length > 10
  ) {
    errors.push("invalid_serving_unit");
  }
  const clean = validateAmounts(amounts, errors);

  if (errors.length > 0) {
    return { ok: false, problem: validationProblem(errors) };
  }

  return {
    ok: true,
    value: {
      name: (name as string).trim(),
      serving_count: serving_count as number,
      serving_unit: (serving_unit as string).trim(),
      amounts: clean,
    },
  };
}

function validateAmounts(
  amounts: unknown,
  errors: string[],
): SupplementAmount[] {
  if (!Array.isArray(amounts) || amounts.length === 0) {
    errors.push("invalid_amounts");
    return [];
  }
  if (amounts.length > MAX_AMOUNTS) {
    errors.push("too_many_amounts");
    return [];
  }
  const clean: SupplementAmount[] = [];
  const seen = new Set<string>();
  for (const [index, raw] of amounts.entries()) {
    if (typeof raw !== "object" || raw === null) {
      errors.push(`amount_${index}_invalid`);
      continue;
    }
    const { nutrient_code, amount } = raw as Record<string, unknown>;
    if (
      typeof nutrient_code !== "string" ||
      !SUPPLEMENT_NUTRIENT_CODES.has(nutrient_code)
    ) {
      errors.push(`amount_${index}_nutrient`);
      continue;
    }
    if (seen.has(nutrient_code)) {
      errors.push(`amount_${index}_duplicate`);
      continue;
    }
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > MAX_AMOUNT
    ) {
      errors.push(`amount_${index}_value`);
      continue;
    }
    seen.add(nutrient_code);
    clean.push({ nutrient_code, amount });
  }
  return clean;
}
