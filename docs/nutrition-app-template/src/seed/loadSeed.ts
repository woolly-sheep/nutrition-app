import foodMaster from "../../seed/frozen/food-master.json";
import nutrientAmount from "../../seed/frozen/nutrient-amount.json";
import nutrientReference from "../../seed/frozen/nutrient-reference.json";
import unitConversion from "../../seed/frozen/unit-conversion.json";

export function loadSeed() {
  return {
    foodMaster,
    nutrientAmount,
    nutrientReference,
    unitConversion,
  } as const;
}
