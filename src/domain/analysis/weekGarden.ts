import type { WeeklyAnalysisResponse } from "../../server/api/schemas/analysis";

/**
 * Turns the weekly report into a row of daily "blooms" (今週の庭). Each day's
 * fulfilment is the mean of that day's recorded nutrient percents; days with
 * no records are buds waiting to open (fulfillment null) — never zero-filled,
 * so a skipped day is not shown as a failure.
 */
export type GardenDay = {
  date: string;
  /** 月..日 */
  weekday: string;
  /** Mean fulfilment 0..1+ for the day, or null when nothing was recorded. */
  fulfillment: number | null;
  isToday: boolean;
  isFuture: boolean;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function buildWeekGarden(
  weekly: WeeklyAnalysisResponse,
  todayIso: string,
): GardenDay[] {
  const sums = new Map<string, { total: number; count: number }>();
  for (const nutrient of weekly.nutrients) {
    for (const day of nutrient.daily) {
      if (typeof day.percent === "number") {
        const entry = sums.get(day.date) ?? { total: 0, count: 0 };
        entry.total += day.percent;
        entry.count += 1;
        sums.set(day.date, entry);
      }
    }
  }

  const days: GardenDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = isoDatePlusDays(weekly.week_start, i);
    const entry = sums.get(date);
    days.push({
      date,
      weekday: WEEKDAYS[weekdayIndex(date)] ?? "",
      fulfillment: entry ? entry.total / entry.count / 100 : null,
      isToday: date === todayIso,
      isFuture: date > todayIso,
    });
  }
  return days;
}

function isoDatePlusDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function weekdayIndex(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
