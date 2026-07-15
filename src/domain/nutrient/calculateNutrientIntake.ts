import type { NutrientAmountRecord } from "../../seed/types";
import type {
  CalculationWarning,
  ConfirmedIntakeItem,
  NutrientCalculationResult,
  NutrientTotal,
} from "./types";

/**
 * Estimates nutrient intake as intake_g × amount_per_100g / 100 and sums
 * per nutrient. Official values are used as-is: a non-numeric
 * amount_per_100g is never coerced or guessed — it becomes a warning.
 */
export function calculateNutrientIntake(
  items: readonly ConfirmedIntakeItem[],
  nutrientAmounts: readonly NutrientAmountRecord[],
): NutrientCalculationResult {
  const amountsByFoodId = groupByFoodId(nutrientAmounts);
  const totals = new Map<string, NutrientTotal>();
  const warnings: CalculationWarning[] = [];

  for (const item of items) {
    if (!isValidIntakeG(item.intakeG)) {
      warnings.push({ code: "invalid_intake_g", foodId: item.foodId });
      continue;
    }

    const records = amountsByFoodId.get(item.foodId);
    if (!records) {
      warnings.push({ code: "unknown_food", foodId: item.foodId });
      continue;
    }

    for (const record of records) {
      if (typeof record.amount_per_100g !== "number") {
        warnings.push({
          code: "non_numeric_official_value",
          foodId: item.foodId,
          nutrientCode: record.nutrient_code,
          officialValue: record.amount_per_100g,
        });
        continue;
      }

      const intakeAmount = (item.intakeG * record.amount_per_100g) / 100;
      const existing = totals.get(record.nutrient_code);
      totals.set(record.nutrient_code, {
        nutrientCode: record.nutrient_code,
        nutrientName: record.nutrient_name,
        unit: record.unit,
        totalAmount: (existing?.totalAmount ?? 0) + intakeAmount,
      });
    }
  }

  return { totals: [...totals.values()], warnings };
}

function isValidIntakeG(intakeG: number): boolean {
  return Number.isFinite(intakeG) && intakeG > 0;
}

function groupByFoodId(
  records: readonly NutrientAmountRecord[],
): Map<string, NutrientAmountRecord[]> {
  const byFoodId = new Map<string, NutrientAmountRecord[]>();
  for (const record of records) {
    const group = byFoodId.get(record.food_id);
    if (group) {
      group.push(record);
      continue;
    }
    byFoodId.set(record.food_id, [record]);
  }
  return byFoodId;
}
