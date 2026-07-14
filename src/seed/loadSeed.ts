import foodMaster from "../../seed/frozen/food-master.json";
import nutrientAmount from "../../seed/frozen/nutrient-amount.json";
import nutrientReference from "../../seed/frozen/nutrient-reference.json";
import unitConversion from "../../seed/frozen/unit-conversion.json";
import type {
  FoodMasterRecord,
  NutrientAmountRecord,
  NutrientReferenceRecord,
  Seed,
  UnitConversionRecord,
} from "./types";

/**
 * Read-only access to the frozen seed. The JSON files are the single
 * source of truth; nothing here recalculates or rewrites official values.
 */
export function loadSeed(): Seed {
  return {
    foodMaster: foodMaster as FoodMasterRecord[],
    nutrientAmount: nutrientAmount as NutrientAmountRecord[],
    nutrientReference: nutrientReference as NutrientReferenceRecord[],
    unitConversion: unitConversion as UnitConversionRecord[],
  } as const;
}
