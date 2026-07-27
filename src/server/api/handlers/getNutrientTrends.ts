import { summarizeDailyIntake } from "../../../domain/analysis/summarizeDailyIntake";
import { calculateNutrientIntake } from "../../../domain/nutrient/calculateNutrientIntake";
import {
  combineIntake,
  sumSupplementIntake,
} from "../../../domain/nutrient/supplementIntake";
import { judgeAgainstReference } from "../../../domain/reference/judgeAgainstReference";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import { listSupplements } from "../../store/supplementStore";
import { readProfile, type StoredProfile } from "../../store/profileStore";
import { resolveProfileForDate } from "../profileResolution";
import type { MealRecord } from "../schemas/meals";
import type { SupplementRecord } from "../schemas/supplements";
import {
  DATA_SOURCES,
  type NutrientTrendPoint,
  type NutrientTrendSeries,
  type NutrientTrendsResponse,
} from "../schemas/analysis";
import { TREND_NOTICE } from "./getNutrientTrend";

export const DEFAULT_TRENDS_DAYS = 7;

type Dependencies = {
  seed?: Seed;
  loadProfile?: () => Promise<StoredProfile | null>;
  loadMeals?: (date: string) => Promise<MealRecord[]>;
  loadSupplements?: (date: string) => Promise<SupplementRecord[]>;
};

/**
 * Batch version of getNutrientTrend for the 分析タブ sparklines (#92): every
 * comparable nutrient's fulfilment over the trailing window, computed in a
 * SINGLE window pass (each day's meals/supplements loaded once and judged for
 * all nutrients together) instead of one request per nutrient. Percent is
 * normalised to that day's reference so the 100% goal line is stable across
 * age-band shifts. Missing days stay null (never zero-filled). Facts only;
 * never log the series here (logging allowlist).
 */
export async function getNutrientTrends(
  date: string,
  windowDays: number = DEFAULT_TRENDS_DAYS,
  {
    seed = loadSeed(),
    loadProfile = readProfile,
    loadMeals = listMeals,
    loadSupplements = listSupplements,
  }: Dependencies = {},
): Promise<NutrientTrendsResponse> {
  const base = {
    date,
    window_days: windowDays,
    notice: TREND_NOTICE,
    sources: DATA_SOURCES,
  };

  const stored = await loadProfile();
  if (stored === null) {
    return { ...base, profile_required: true, nutrients: [] };
  }
  const profile: StoredProfile = stored;

  const dates = windowDates(date, windowDays);
  // date → (nutrient_code → percent) for the recorded days only.
  const percentByDate = new Map<string, Map<string, number>>();
  // Preserve first-seen order so the series list is stable across runs.
  const codeOrder: string[] = [];
  const seenCodes = new Set<string>();

  for (const dayDate of dates) {
    const dayPercents = await percentsForDay(dayDate);
    percentByDate.set(dayDate, dayPercents);
    for (const code of dayPercents.keys()) {
      if (!seenCodes.has(code)) {
        seenCodes.add(code);
        codeOrder.push(code);
      }
    }
  }

  const nutrients: NutrientTrendSeries[] = codeOrder.map((code) => {
    const points: NutrientTrendPoint[] = dates.map((dayDate) => {
      const percent = percentByDate.get(dayDate)?.get(code);
      return percent === undefined
        ? { date: dayDate, percent: null, has_record: false }
        : { date: dayDate, percent, has_record: true };
    });
    return { nutrient_code: code, points };
  });

  return { ...base, profile_required: false, nutrients };

  /** All comparable nutrients' fulfilment % for one day (empty when no data). */
  async function percentsForDay(dayDate: string): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const meals = await loadMeals(dayDate);
    const items = meals.flatMap((meal) =>
      meal.items.map((item) => ({
        foodId: item.food_id,
        intakeG: item.intake_g,
      })),
    );
    if (items.length === 0) {
      return result;
    }
    const resolved = resolveProfileForDate(profile, dayDate);
    if (!resolved.ok) {
      return result;
    }
    const calculation = calculateNutrientIntake(items, seed.nutrientAmount);
    const foodByCode = new Map(
      calculation.totals.map((total) => [total.nutrientCode, total.totalAmount]),
    );
    // Combine self-reported supplements so the trend matches daily fulfilment
    // (issue #67), the same combined-intake rule as getDailyAnalysis.
    const supplementByCode = sumSupplementIntake(await loadSupplements(dayDate));
    const intakeByCode = combineIntake(foodByCode, supplementByCode);
    const judgments = judgeAgainstReference(
      intakeByCode,
      resolved.profile,
      seed.nutrientReference,
    );
    for (const entry of summarizeDailyIntake(judgments).comparable) {
      if (typeof entry.percentOfReference === "number") {
        result.set(entry.judgment.nutrientCode, entry.percentOfReference);
      }
    }
    return result;
  }
}

/** Trailing window of ISO dates, oldest → newest, ending at `date`. */
function windowDates(date: string, windowDays: number): string[] {
  const end = new Date(`${date}T00:00:00Z`);
  const dates: string[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(end);
    day.setUTCDate(end.getUTCDate() - offset);
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}
