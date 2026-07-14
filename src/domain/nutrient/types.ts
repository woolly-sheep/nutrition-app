import type { OfficialValue } from "../../seed/types";

/**
 * A confirmed meal entry. Only user_confirmed_mapping foods reach this
 * layer, and the amount is always explicit grams (explicit grams first).
 */
export type ConfirmedIntakeItem = {
  foodId: string;
  intakeG: number;
};

export type NutrientTotal = {
  nutrientCode: string;
  nutrientName: string;
  unit: string;
  totalAmount: number;
};

export type CalculationWarningCode =
  | "invalid_intake_g"
  | "unknown_food"
  | "non_numeric_official_value";

/**
 * Non-computable data is reported as a warning instead of being silently
 * skipped or guessed. Warnings carry ids/codes only — never meal contents.
 */
export type CalculationWarning = {
  code: CalculationWarningCode;
  foodId: string;
  nutrientCode?: string;
  officialValue?: OfficialValue;
};

export type NutrientCalculationResult = {
  totals: readonly NutrientTotal[];
  warnings: readonly CalculationWarning[];
};
