import type { PetalValue } from "../domain/analysis/nutrientGroups";

/**
 * Home hero: 栄養バランスの花. Each of the 6 petals grows with its group's
 * fulfilment; a group that reaches its reference turns gold (--color-accent
 * = achievement, the same semantic as AchievementBadge). Groups with no
 * comparable data show as short buds (outline), framed as "to bloom", never
 * as a wilted/penalising empty state. Exact figures live below the flower
 * (progressive disclosure) — the flower is the emotional layer only.
 */

const CENTER = 120;
const CENTER_Y = 115;
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
      width="248"
      height="238"
      viewBox="0 0 240 230"
      role="img"
      aria-label={ariaLabel(petals, overall)}
    >
      {petals.map((petal, i) => {
        const angle = ANGLES[i] ?? 0;
        const isBud = petal.fulfillment === null;
        const capped = Math.min(petal.fulfillment ?? 0, 1);
        const ry = isBud ? MIN_RY : MIN_RY + capped * MAX_EXTRA;
        const cy = CENTER_Y - (20 + ry);
        const fill = petal.achieved
          ? "var(--color-accent)"
          : isBud
            ? "transparent"
            : "var(--color-primary)";
        return (
          <ellipse
            key={petal.key}
            cx={CENTER}
            cy={cy}
            rx={RX}
            ry={ry}
            fill={fill}
            stroke={isBud ? "var(--color-primary)" : "none"}
            strokeWidth={isBud ? 1.5 : 0}
            strokeDasharray={isBud ? "3 3" : undefined}
            transform={`rotate(${angle} ${CENTER} ${CENTER_Y})`}
          />
        );
      })}

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
        const x = CENTER + 96 * Math.sin(rad);
        const y = CENTER_Y - 96 * Math.cos(rad);
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
      : `${p.label} ${Math.round(p.fulfillment * 100)}%`,
  );
  const head =
    overall === null
      ? "栄養バランスの花。"
      : `栄養バランスの花。全体で約${Math.round(overall * 100)}%充足。`;
  return `${head}${parts.join("、")}。長い花びらほど基準に近い推定です。`;
}
