import type { DailySummaryItem } from "./summarizeDailyIntake";

/**
 * Weekly fulfillment report (UI design v0.1 §4.3 / explorations 5c+6c).
 * Days without records are excluded from averages — never treated as
 * zero intake — and reported so the UI can explain the exclusion.
 */

export type WeeklyDayInput = {
  date: string;
  /** null = no records that day (excluded from averages). */
  items: readonly DailySummaryItem[] | null;
};

export type WeeklyDailyCell = {
  date: string;
  /** null = no records that day. */
  percent: number | null;
};

export type WeeklyNutrient = {
  nutrientCode: string;
  nutrientName: string;
  unit: string;
  /** Mean percent over recorded days only. */
  averagePercent: number;
  /** Recorded days with percent < 50 (hatched cells / patterns). */
  daysBelow50: number;
  /** Recorded days with percent >= 100 (✓ cells / achievements). */
  daysAchieved: number;
  recordedDays: number;
  daily: readonly WeeklyDailyCell[];
};

export type WeeklySummary = {
  recordedDates: readonly string[];
  missingDates: readonly string[];
  /** Average descending — achievements first (5b framing). */
  nutrients: readonly WeeklyNutrient[];
  /** Nutrients below 50% on at least half of recorded days (min 2). */
  patterns: readonly WeeklyNutrient[];
};

export function summarizeWeeklyIntake(
  days: readonly WeeklyDayInput[],
): WeeklySummary {
  const recordedDates = days
    .filter((day) => day.items !== null)
    .map((day) => day.date);
  const missingDates = days
    .filter((day) => day.items === null)
    .map((day) => day.date);

  const nutrients = collectNutrients(days)
    .map((nutrient) => buildWeeklyNutrient(nutrient, days))
    .sort((a, b) => b.averagePercent - a.averagePercent);

  const patterns = nutrients
    .filter(
      (nutrient) =>
        nutrient.recordedDays >= 2 &&
        nutrient.daysBelow50 * 2 >= nutrient.recordedDays &&
        nutrient.daysBelow50 > 0,
    )
    .sort((a, b) => a.averagePercent - b.averagePercent);

  return { recordedDates, missingDates, nutrients, patterns };
}

type NutrientKey = {
  nutrientCode: string;
  nutrientName: string;
  unit: string;
};

function collectNutrients(days: readonly WeeklyDayInput[]): NutrientKey[] {
  const byCode = new Map<string, NutrientKey>();
  for (const day of days) {
    for (const item of day.items ?? []) {
      if (!byCode.has(item.judgment.nutrientCode)) {
        byCode.set(item.judgment.nutrientCode, {
          nutrientCode: item.judgment.nutrientCode,
          nutrientName: item.judgment.nutrientName,
          unit: item.judgment.unit,
        });
      }
    }
  }
  return [...byCode.values()];
}

function buildWeeklyNutrient(
  nutrient: NutrientKey,
  days: readonly WeeklyDayInput[],
): WeeklyNutrient {
  const daily: WeeklyDailyCell[] = days.map((day) => {
    if (day.items === null) {
      return { date: day.date, percent: null };
    }
    const item = day.items.find(
      (candidate) => candidate.judgment.nutrientCode === nutrient.nutrientCode,
    );
    return { date: day.date, percent: item?.percentOfReference ?? 0 };
  });

  const recorded = daily.filter(
    (cell): cell is { date: string; percent: number } => cell.percent !== null,
  );
  const averagePercent =
    recorded.length === 0
      ? 0
      : recorded.reduce((sum, cell) => sum + cell.percent, 0) / recorded.length;

  return {
    ...nutrient,
    averagePercent,
    daysBelow50: recorded.filter((cell) => cell.percent < 50).length,
    daysAchieved: recorded.filter((cell) => cell.percent >= 100).length,
    recordedDays: recorded.length,
    daily,
  };
}
