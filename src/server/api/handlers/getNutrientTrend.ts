import { summarizeDailyIntake } from "../../../domain/analysis/summarizeDailyIntake";
import { calculateNutrientIntake } from "../../../domain/nutrient/calculateNutrientIntake";
import { judgeAgainstReference } from "../../../domain/reference/judgeAgainstReference";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import { readProfile, type StoredProfile } from "../../store/profileStore";
import { resolveProfileForDate } from "../profileResolution";
import type { MealRecord } from "../schemas/meals";
import {
  DATA_SOURCES,
  type NutrientTrendPoint,
  type NutrientTrendResponse,
} from "../schemas/analysis";

export const TREND_NOTICE =
  "出典: 食品成分表(八訂) / 食事摂取基準(2025)。記録した日のみの推定で、記録のない日は含みません。";

export const DEFAULT_TREND_DAYS = 28;

type Dependencies = {
  seed?: Seed;
  loadProfile?: () => Promise<StoredProfile | null>;
  loadMeals?: (date: string) => Promise<MealRecord[]>;
};

/**
 * One nutrient's fulfilment over the trailing window (dashboard insight
 * ③). Percent is normalised to that day's reference so the 100% goal line
 * is stable across age-band shifts. Facts only; missing days stay null
 * (never zero-filled). Never log the series here (logging allowlist).
 */
export async function getNutrientTrend(
  date: string,
  nutrientCode: string,
  windowDays: number = DEFAULT_TREND_DAYS,
  {
    seed = loadSeed(),
    loadProfile = readProfile,
    loadMeals = listMeals,
  }: Dependencies = {},
): Promise<NutrientTrendResponse> {
  const meta = nutrientMeta(nutrientCode, seed);
  const base = {
    date,
    nutrient_code: nutrientCode,
    nutrient_name: meta.name,
    unit: meta.unit,
    window_days: windowDays,
    notice: TREND_NOTICE,
    sources: DATA_SOURCES,
  };

  const stored = await loadProfile();
  if (stored === null) {
    return {
      ...base,
      profile_required: true,
      points: [],
      recorded_days: 0,
      days_below_reference: 0,
    };
  }
  const profile: StoredProfile = stored;

  const points: NutrientTrendPoint[] = [];
  let recordedDays = 0;
  let daysBelow = 0;

  for (const dayDate of windowDates(date, windowDays)) {
    const percent = await percentForDay(dayDate);
    if (percent === null) {
      points.push({ date: dayDate, percent: null, has_record: false });
      continue;
    }
    recordedDays += 1;
    if (percent < 100) {
      daysBelow += 1;
    }
    points.push({ date: dayDate, percent, has_record: true });
  }

  return {
    ...base,
    profile_required: false,
    points,
    recorded_days: recordedDays,
    days_below_reference: daysBelow,
  };

  async function percentForDay(dayDate: string): Promise<number | null> {
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
    const resolved = resolveProfileForDate(profile, dayDate);
    if (!resolved.ok) {
      return null;
    }
    const calculation = calculateNutrientIntake(items, seed.nutrientAmount);
    const intakeByCode = new Map(
      calculation.totals.map((total) => [total.nutrientCode, total.totalAmount]),
    );
    const judgments = judgeAgainstReference(
      intakeByCode,
      resolved.profile,
      seed.nutrientReference,
    );
    const item = summarizeDailyIntake(judgments).comparable.find(
      (candidate) => candidate.judgment.nutrientCode === nutrientCode,
    );
    return item?.percentOfReference ?? null;
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

function nutrientMeta(
  nutrientCode: string,
  seed: Seed,
): { name: string; unit: string } {
  const record = seed.nutrientAmount.find(
    (entry) => entry.nutrient_code === nutrientCode,
  );
  return {
    name: record?.nutrient_name ?? nutrientCode,
    unit: record?.unit ?? "",
  };
}
