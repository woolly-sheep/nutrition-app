import { summarizeDailyIntake } from "../../../domain/analysis/summarizeDailyIntake";
import {
  summarizeWeeklyIntake,
  type WeeklyDayInput,
  type WeeklyNutrient,
} from "../../../domain/analysis/summarizeWeeklyIntake";
import { calculateNutrientIntake } from "../../../domain/nutrient/calculateNutrientIntake";
import { judgeAgainstReference } from "../../../domain/reference/judgeAgainstReference";
import { DISCLAIMER } from "../../../domain/wording/safeWording";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import { readProfile, type StoredProfile } from "../../store/profileStore";
import { resolveProfileForDate } from "../profileResolution";
import type { MealRecord } from "../schemas/meals";
import {
  DATA_SOURCES,
  type WeeklyAnalysisResponse,
  type WeeklyNutrientItem,
} from "../schemas/analysis";

type Dependencies = {
  seed?: Seed;
  loadProfile?: () => Promise<StoredProfile | null>;
  loadMeals?: (date: string) => Promise<MealRecord[]>;
};

/**
 * Weekly fulfillment report for the Monday-start week containing `date`,
 * evaluated only up to `date` (future days are not "missing"). Days
 * without records are excluded from averages (6c), never zero-filled.
 */
export async function getWeeklyAnalysis(
  date: string,
  {
    seed = loadSeed(),
    loadProfile = readProfile,
    loadMeals = listMeals,
  }: Dependencies = {},
): Promise<WeeklyAnalysisResponse> {
  const { weekStart, weekEnd, evaluatedDates } = weekWindow(date);
  const base = {
    date,
    week_start: weekStart,
    week_end: weekEnd,
    disclaimer: DISCLAIMER,
    sources: DATA_SOURCES,
  };

  const profile = await loadProfile();
  if (profile === null) {
    return {
      ...base,
      profile: null,
      profile_required: true,
      recorded_dates: [],
      missing_dates: [],
      nutrients: [],
      patterns: [],
    };
  }

  const weekResolution = resolveProfileForDate(profile, date);
  const weekBand = weekResolution.ok ? weekResolution.profile.ageBand : null;

  const days: WeeklyDayInput[] = [];
  for (const dayDate of evaluatedDates) {
    days.push({ date: dayDate, items: await dayItems(dayDate, profile) });
  }
  const summary = summarizeWeeklyIntake(days);

  return {
    ...base,
    profile: {
      ...profile,
      ...(weekBand ? { ageBand: weekBand } : {}),
    },
    profile_required: false,
    recorded_dates: summary.recordedDates,
    missing_dates: summary.missingDates,
    nutrients: summary.nutrients.map(toResponseNutrient),
    patterns: summary.patterns.map((nutrient) => ({
      nutrient_code: nutrient.nutrientCode,
      nutrient_name: nutrient.nutrientName,
      days_below_50: nutrient.daysBelow50,
      recorded_days: nutrient.recordedDays,
    })),
  };

  async function dayItems(dayDate: string, dayProfile: StoredProfile) {
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
      calculation.totals.map((total) => [
        total.nutrientCode,
        total.totalAmount,
      ]),
    );
    // Band resolved per day: a birthday inside the week shifts it.
    const resolved = resolveProfileForDate(dayProfile, dayDate);
    if (!resolved.ok) {
      return null;
    }
    const judgments = judgeAgainstReference(
      intakeByCode,
      resolved.profile,
      seed.nutrientReference,
    );
    return summarizeDailyIntake(judgments).comparable;
  }
}

function toResponseNutrient(nutrient: WeeklyNutrient): WeeklyNutrientItem {
  return {
    nutrient_code: nutrient.nutrientCode,
    nutrient_name: nutrient.nutrientName,
    unit: nutrient.unit,
    average_percent: nutrient.averagePercent,
    days_below_50: nutrient.daysBelow50,
    days_achieved: nutrient.daysAchieved,
    recorded_days: nutrient.recordedDays,
    daily: nutrient.daily.map((cell) => ({
      date: cell.date,
      percent: cell.percent,
    })),
  };
}

/** Monday-start week containing `date`, evaluated only up to `date`. */
function weekWindow(date: string): {
  weekStart: string;
  weekEnd: string;
  evaluatedDates: string[];
} {
  const day = new Date(`${date}T00:00:00Z`);
  const mondayOffset = (day.getUTCDay() + 6) % 7;
  const monday = new Date(day);
  monday.setUTCDate(day.getUTCDate() - mondayOffset);

  const evaluatedDates: string[] = [];
  for (let i = 0; i <= mondayOffset; i += 1) {
    const current = new Date(monday);
    current.setUTCDate(monday.getUTCDate() + i);
    evaluatedDates.push(toIsoDate(current));
  }
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    weekStart: toIsoDate(monday),
    weekEnd: toIsoDate(sunday),
    evaluatedDates,
  };
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
