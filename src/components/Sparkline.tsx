"use client";

import type { NutrientTrendPoint } from "../server/api/schemas/analysis";

/**
 * A single nutrient's fulfilment trend (dashboard insight ③): a small
 * area sparkline with the goal (100%) as a gold dashed hairline and the
 * latest recorded day emphasised. No red — teal for intake, gold for the
 * goal, matching the bloom. Recorded days only: gaps are skipped, never
 * drawn as zero (getNutrientTrend returns null for missing days).
 */

const WIDTH = 260;
const HEIGHT = 44;
const GOAL_Y = 12; // the 100% line
const PADDING_TOP = 4;
const MAX_PERCENT = 150; // clamp so a single big day doesn't flatten the rest

type Props = {
  points: readonly NutrientTrendPoint[];
};

export function Sparkline({ points }: Props) {
  const recorded = points
    .map((point, index) => ({ point, index }))
    .filter((entry) => entry.point.percent !== null);

  if (recorded.length < 2) {
    return null;
  }

  const xFor = (index: number) =>
    points.length <= 1 ? 0 : (index / (points.length - 1)) * WIDTH;
  const yFor = (percent: number) => {
    const clamped = Math.min(Math.max(percent, 0), MAX_PERCENT);
    // percent 0 → bottom, 100 → GOAL_Y, MAX_PERCENT → PADDING_TOP
    const usable = HEIGHT - PADDING_TOP;
    return HEIGHT - (clamped / MAX_PERCENT) * usable;
  };

  const coords = recorded.map((entry) => ({
    x: xFor(entry.index),
    y: yFor(entry.point.percent as number),
  }));
  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT} L${coords[0].x.toFixed(1)},${HEIGHT} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg
      width="100%"
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="この栄養素の推移（記録した日のみ・目安を点線で表示）"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-primary)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        y1={GOAL_Y}
        x2={WIDTH}
        y2={GOAL_Y}
        stroke="var(--color-accent)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <path d={area} fill="url(#sparkFill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r="3.5"
        fill="var(--color-primary)"
        stroke="var(--color-base)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
