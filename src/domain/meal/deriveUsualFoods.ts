/**
 * いつもの食事 — derived read-only view over past records
 * (UI design v0.3 addendum §1). No persisted entity: foods that appear
 * at least twice in the recent window for the same meal type, most
 * frequent first, with the grams from their latest occurrence.
 */

export type UsualFoodSource = {
  date: string;
  mealType: string;
  items: readonly { foodId: string; intakeG: number }[];
};

export type UsualFood = {
  foodId: string;
  /** Grams from the latest record of this food (not an average). */
  intakeG: number;
  occurrences: number;
};

export const USUAL_MIN_OCCURRENCES = 2;
export const USUAL_MAX_RESULTS = 4;

export function deriveUsualFoods(
  meals: readonly UsualFoodSource[],
  mealType: string,
): UsualFood[] {
  const stats = new Map<string, { count: number; lastDate: string; lastG: number }>();

  for (const meal of meals) {
    if (meal.mealType !== mealType) {
      continue;
    }
    for (const item of meal.items) {
      const current = stats.get(item.foodId);
      if (!current) {
        stats.set(item.foodId, {
          count: 1,
          lastDate: meal.date,
          lastG: item.intakeG,
        });
        continue;
      }
      current.count += 1;
      if (meal.date >= current.lastDate) {
        current.lastDate = meal.date;
        current.lastG = item.intakeG;
      }
    }
  }

  return [...stats.entries()]
    .filter(([, stat]) => stat.count >= USUAL_MIN_OCCURRENCES)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, USUAL_MAX_RESULTS)
    .map(([foodId, stat]) => ({
      foodId,
      intakeG: stat.lastG,
      occurrences: stat.count,
    }));
}
