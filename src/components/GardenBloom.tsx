/**
 * Small daily bloom shared by 今週の庭 (WeekGarden) and 月間の庭 (MonthGarden).
 * Bloom size grows with the day's mean fulfilment; a fully-achieved day is
 * gold, un-recorded days are faint buds, and "today" is an open ring.
 *
 * The viewBox is 40×40 (centre 20) so a fully bloomed petal — tip radius
 * 4 + 2*ry_max = 19 from the centre — stays inside the box with a 1px margin
 * instead of overflowing a 30×30 box and being clipped (issue #41).
 */

type Props = {
  fulfillment: number | null;
  isToday?: boolean;
  isFuture?: boolean;
  /** Rendered pixel size; the flower scales to fit (default 30). */
  size?: number;
};

const PETAL_ANGLES = [0, 72, 144, 216, 288];

export function GardenBloom({
  fulfillment,
  isToday = false,
  isFuture = false,
  size = 30,
}: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 40 40",
    "aria-hidden": true as const,
  };

  if (isToday) {
    return (
      <svg {...common}>
        <circle
          cx="20"
          cy="20"
          r="8"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
        />
        <circle cx="20" cy="20" r="2.7" fill="var(--color-primary)" />
      </svg>
    );
  }

  if (isFuture || fulfillment === null) {
    return (
      <svg {...common}>
        <circle cx="20" cy="20" r="4.5" fill="var(--color-surface)" />
      </svg>
    );
  }

  const capped = Math.min(fulfillment, 1);
  const ry = 4 + capped * 3.5;
  const achieved = fulfillment >= 1;
  const fill = achieved ? "var(--color-accent)" : "var(--color-primary)";
  const centerFill = achieved ? "#fdf0cf" : "var(--color-surface)";
  return (
    <svg {...common}>
      {PETAL_ANGLES.map((angle) => (
        <ellipse
          key={angle}
          cx="20"
          cy={20 - (4 + ry)}
          rx="3.1"
          ry={ry}
          fill={fill}
          transform={`rotate(${angle} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="3" fill={centerFill} />
    </svg>
  );
}
