import type { PetalValue } from "../domain/analysis/nutrientGroups";

/**
 * Home hero: 栄養バランスの花. Each of the 6 petals grows with its group's
 * fulfilment; a group that reaches its reference turns gold (--color-accent
 * = achievement, the same semantic as AchievementBadge). Groups with no
 * comparable data show as short buds (outline), framed as "to bloom", never
 * as a wilted/penalising empty state. Exact figures live below the flower
 * (progressive disclosure) — the flower is the emotional layer only.
 */

// Layout: the viewBox is deliberately larger than the flower so labels sit in
// a ring OUTSIDE the petals with margin on every side. Petal tips reach radius
// (20 + 2*ry_max) = 104 from the centre; labels are placed at LABEL_R = 116 so
// a fully bloomed petal never covers or overruns its label (issue #41).
const VIEW_W = 300;
const VIEW_H = 264;
const CENTER = 150;
const CENTER_Y = 132;
const LABEL_R = 116;
const ANGLES = [0, 60, 120, 180, 240, 300];
const RX = 13;
const MIN_RY = 14;
const MAX_EXTRA = 28;

type Props = {
  petals: readonly PetalValue[];
  /** Overall mean fulfilment 0..1+, shown in the flower centre. */
  overall: number | null;
};

export function BloomFlower({ petals, overall }: Props) {
  return (
    <svg
      width={VIEW_W}
      height={VIEW_H}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      // Scale to the container and never overflow it horizontally.
      style={{ width: "100%", maxWidth: VIEW_W, height: "auto" }}
      role="img"
      aria-label={ariaLabel(petals, overall)}
    >
      <style>{`
        .bloom-petals { animation: bloomGrow 0.6s ease-out both; transform-origin: center; transform-box: fill-box; }
        @keyframes bloomGrow { from { transform: scale(0.55); opacity: 0.5; } to { transform: scale(1); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .bloom-petals { animation: none; } }
      `}</style>
      <defs>
        {/* Teal hatch = supplement-derived share (decision-20260724-supplement-intake). */}
        <pattern
          id="bloom-supplement-hatch"
          width="5"
          height="5"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="5" height="5" fill="var(--color-primary)" opacity="0.18" />
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--color-primary)" strokeWidth="2" />
        </pattern>
      </defs>
      <g className="bloom-petals">
      {petals.map((petal, i) => {
        const angle = ANGLES[i] ?? 0;
        const isBud = petal.fulfillment === null;
        const capped = Math.min(petal.fulfillment ?? 0, 1);
        const ry = isBud ? MIN_RY : MIN_RY + capped * MAX_EXTRA;
        const cy = CENTER_Y - (20 + ry);
        // Over the upper limit: deep teal, never gold — flagged calmly with a
        // ring at the tip (see the 気をつけたい section for the figure).
        const fill = petal.overLimit
          ? "var(--color-primary-deep)"
          : petal.achieved
            ? "var(--color-accent)"
            : isBud
              ? "transparent"
              : "var(--color-primary)";
        // Food-only length: a shorter ellipse sharing the same inner edge
        // (base is fixed at CENTER_Y-20). Drawn on top of the full-length
        // petal, so the tip beyond it stays hatched = the supplement share.
        const foodCapped = Math.min(petal.foodFulfillment ?? capped, capped);
        const ryFood = isBud ? MIN_RY : MIN_RY + foodCapped * MAX_EXTRA;
        const cyFood = CENTER_Y - (20 + ryFood);
        const hasSupplement = !isBud && ryFood < ry - 0.5;
        const tipY = cy - ry;
        return (
          <g key={petal.key} transform={`rotate(${angle} ${CENTER} ${CENTER_Y})`}>
            {/* Full petal: solid when no supplement, else hatched tip layer. */}
            <ellipse
              cx={CENTER}
              cy={cy}
              rx={RX}
              ry={ry}
              fill={
                hasSupplement && !petal.achieved && !petal.overLimit
                  ? "url(#bloom-supplement-hatch)"
                  : fill
              }
              stroke={isBud ? "var(--color-primary)" : "none"}
              strokeWidth={isBud ? 1.5 : 0}
              strokeDasharray={isBud ? "3 3" : undefined}
            />
            {/* Food share drawn solid on top, covering the base up to ryFood. */}
            {hasSupplement && (
              <ellipse cx={CENTER} cy={cyFood} rx={RX} ry={ryFood} fill={fill} />
            )}
            {petal.overLimit && (
              <circle
                cx={CENTER}
                cy={tipY + 7}
                r={4}
                fill="none"
                stroke="var(--color-base)"
                strokeWidth={2}
              />
            )}
          </g>
        );
      })}
      </g>

      <circle cx={CENTER} cy={CENTER_Y} r={25} fill="var(--color-surface)" />
      <text
        x={CENTER}
        y={CENTER_Y - 3}
        textAnchor="middle"
        fontFamily="var(--font-numeric)"
        fontSize="24"
        fontWeight={700}
        fill="var(--color-primary-deep)"
      >
        {overall === null ? "—" : Math.round(overall * 100)}
      </text>
      <text x={CENTER} y={CENTER_Y + 12} textAnchor="middle" fontSize="9" fill="var(--color-subtext)">
        {overall === null ? "記録待ち" : "% 充足"}
      </text>

      {petals.map((petal, i) => {
        const angle = ANGLES[i] ?? 0;
        const rad = (angle * Math.PI) / 180;
        const x = CENTER + LABEL_R * Math.sin(rad);
        const y = CENTER_Y - LABEL_R * Math.cos(rad);
        return (
          <text
            key={`label-${petal.key}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill={petal.achieved ? "#c79a12" : "var(--color-subtext)"}
          >
            {petal.label}
          </text>
        );
      })}
    </svg>
  );
}

function ariaLabel(
  petals: readonly PetalValue[],
  overall: number | null,
): string {
  const parts = petals.map((p) =>
    p.fulfillment === null
      ? `${p.label}は記録待ち`
      : `${p.label} ${Math.round(p.fulfillment * 100)}%${p.overLimit ? "（上限超えの推定）" : ""}`,
  );
  const head =
    overall === null
      ? "栄養バランスの花。"
      : `栄養バランスの花。全体で約${Math.round(overall * 100)}%充足。`;
  return `${head}${parts.join("、")}。長い花びらほど基準に近い推定です。`;
}
