import { appendSupplement } from "../../store/supplementStore";
import type { ProblemDetails } from "../errors/problem";
import { validationProblem } from "../errors/problem";
import {
  SUPPLEMENT_NUTRIENT_CODES,
  type CreateSupplementRequest,
  type SupplementAmount,
  type SupplementRecord,
} from "../schemas/supplements";

export type SaveSupplementResult =
  | { ok: true; supplement: SupplementRecord }
  | { ok: false; problem: ProblemDetails };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNTS = 30;
const MAX_AMOUNT = 100000;
const MAX_NAME_LEN = 100;

/**
 * Validates and saves one self-reported supplement record. Like meals,
 * validation errors return field codes only, never the submitted values
 * (a product name is user data and must not leak into errors/logs).
 */
export async function saveSupplement(
  body: unknown,
  save: (
    input: CreateSupplementRequest,
  ) => Promise<SupplementRecord> = appendSupplement,
): Promise<SaveSupplementResult> {
  const validated = validateSupplementBody(body);
  if (!validated.ok) {
    return validated;
  }
  const supplement = await save(validated.value);
  return { ok: true, supplement };
}

type ValidatedBody =
  | { ok: true; value: CreateSupplementRequest }
  | { ok: false; problem: ProblemDetails };

/**
 * Shared validation for the create and edit paths. Enforces the date /
 * product-name / amounts rules and, on failure, returns field codes only so
 * the submitted product name never leaks into an error body or log.
 */
export function validateSupplementBody(body: unknown): ValidatedBody {
  if (typeof body !== "object" || body === null) {
    return { ok: false, problem: validationProblem(["invalid_body"]) };
  }
  const { date, product_name, amounts } = body as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof date !== "string" || !DATE_RE.test(date)) {
    errors.push("invalid_date");
  }
  if (
    typeof product_name !== "string" ||
    product_name.trim() === "" ||
    product_name.length > MAX_NAME_LEN
  ) {
    errors.push("invalid_product_name");
  }
  const clean = validateAmounts(amounts, errors);

  if (errors.length > 0) {
    return { ok: false, problem: validationProblem(errors) };
  }

  return {
    ok: true,
    value: {
      date: date as string,
      product_name: (product_name as string).trim(),
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

export { MAX_AMOUNTS, MAX_AMOUNT, MAX_NAME_LEN };
