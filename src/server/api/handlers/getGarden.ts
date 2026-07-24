import { summarizeDailyIntake } from "../../../domain/analysis/summarizeDailyIntake";
import { calculateNutrientIntake } from "../../../domain/nutrient/calculateNutrientIntake";
import { judgeAgainstReference } from "../../../domain/reference/judgeAgainstReference";
import { DISCLAIMER } from "../../../domain/wording/safeWording";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import { readProfile, type StoredProfile } from "../../store/profileStore";
import { resolveProfileForDate } from "../profileResolution";
import type { MealRecord } from "../schemas/meals";
import { DATA_SOURCES } from "../schemas/analysis";

/**
 * 月間の庭 — one bloom per day over the last GARDEN_DAYS days. Each day's
 * fulfilment is the mean of that day's comparable (RDA/AI) nutrient percents,
 * matching the home flower's centre. Days with no records stay null (buds),
 * never zero-filled.
 */

export const GARDEN_DAYS = 35;

export type GardenDayCell = {
  date: string;
  fulfillment: number | null;
};

export type GardenResponse = {
  date: string;
  profile_required: boolean;
  days: readonly GardenDayCell[];
  disclaimer: string;
  sources: readonly string[];
};

type Dependencies = {
  seed?: Seed;
  loadProfile?: () => Promise<StoredProfile | null>;
  loadMeals?: (date: string) => Promise<MealRecord[]>;
  days?: number;
};

export async function getGarden(
  date: string,
  {
    seed = loadSeed(),
    loadProfile = readProfile,
    loadMeals = listMeals,
    days = GARDEN_DAYS,
  }: Dependencies = {},
): Promise<GardenResponse> {
  const base = { date, disclaimer: DISCLAIMER, sources: DATA_SOURCES };

  const profile = await loadProfile();
  if (profile === null) {
    return { ...base, profile_required: true, days: [] };
  }

  const cells: GardenDayCell[] = [];
  for (const dayDate of lastDates(date, days)) {
    cells.push({
      date: dayDate,
      fulfillment: await dayFulfillment(dayDate, profile),
    });
  }
  return { ...base, profile_required: false, days: cells };

  async function dayFulfillment(
    dayDate: string,
    dayProfile: StoredProfile,
  ): Promise<number | null> {
    const meals = await loadMeals(dayDate);
    const items = meals.flatMap((meal) =>
      meal.items.map((item) => ({
        foodId: item.food_id,
        intakeG: item.intake_g,
      })),
    );
    if (items.length === 0) {
      return null;
    }
    const calculation = calculateNutrientIntake(items, seed.nutrientAmount);
    const intakeByCode = new Map(
      calculation.totals.map((total) => [total.nutrientCode, total.totalAmount]),
    );
    const resolved = resolveProfileForDate(dayProfile, dayDate);
    if (!resolved.ok) {
      return null;
    }
    const judgments = judgeAgainstReference(
      intakeByCode,
      resolved.profile,
      seed.nutrientReference,
    );
    const percents = summarizeDailyIntake(judgments)
      .comparable.map((item) => item.percentOfReference)
      .filter((v): v is number => typeof v === "number");
    if (percents.length === 0) {
      return null;
    }
    return percents.reduce((sum, v) => sum + v, 0) / percents.length / 100;
  }
}

/** `days` ISO dates ending at (and including) `date`, oldest first. */
function lastDates(date: string, days: number): string[] {
  const end = new Date(`${date}T00:00:00Z`);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
