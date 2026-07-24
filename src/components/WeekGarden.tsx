import type { GardenDay } from "../domain/analysis/weekGarden";

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
          <DayBloom day={day} />
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

function DayBloom({ day }: { day: GardenDay }) {
  if (day.isToday) {
    return (
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="15" cy="15" r="6" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
        <circle cx="15" cy="15" r="2" fill="var(--color-primary)" />
      </svg>
    );
  }
  if (day.isFuture || day.fulfillment === null) {
    return (
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="15" cy="15" r="3.5" fill="var(--color-surface)" />
      </svg>
    );
  }

  const capped = Math.min(day.fulfillment, 1);
  const ry = 4 + capped * 3.5;
  const achieved = day.fulfillment >= 1;
  const fill = achieved ? "var(--color-accent)" : "var(--color-primary)";
  const centerFill = achieved ? "#fdf0cf" : "var(--color-surface)";
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="15"
          cy={15 - (4 + ry)}
          rx="3.1"
          ry={ry}
          fill={fill}
          transform={`rotate(${angle} 15 15)`}
        />
      ))}
      <circle cx="15" cy="15" r="3" fill={centerFill} />
    </svg>
  );
}
