import type { GardenDay } from "../domain/analysis/weekGarden";
import { GardenBloom } from "./GardenBloom";

/**
 * 今週の庭: one small bloom per day. Bloom size grows with the day's mean
 * fulfilment; a fully-achieved day is gold. Today is an open ring, future
 * days and un-recorded past days are faint buds — each day is its own bloom,
 * so a gap never reads as a wilted streak.
 */
type Props = {
  days: readonly GardenDay[];
};

export function WeekGarden({ days }: Props) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      {days.map((day) => (
        <div key={day.date} style={{ textAlign: "center" }}>
          <GardenBloom
            fulfillment={day.fulfillment}
            isToday={day.isToday}
            isFuture={day.isFuture}
            size={30}
          />
          <div
            style={{
              fontSize: "11px",
              marginTop: "4px",
              color: day.isToday ? "var(--color-primary-deep)" : "var(--color-subtext)",
            }}
          >
            {day.isToday ? "今日" : day.weekday}
          </div>
        </div>
      ))}
    </div>
  );
}
