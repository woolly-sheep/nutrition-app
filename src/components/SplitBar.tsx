/**
 * Split fulfilment bar: food-derived intake as a solid teal fill, and the
 * supplement-derived share on top as a teal HATCH (same hue = same nutrient,
 * different texture = different, self-reported source). This is deliberately
 * distinct from the gray hatch used for "remainder" in BulletBar — here the
 * hatch lines are teal, sitting on the filled part of the bar
 * (decision-20260724-supplement-intake). No red, no gold.
 */

type Props = {
  /** Food-only intake ÷ reference × 100. */
  foodPercent: number;
  /** Combined (food + supplement) intake ÷ reference × 100. */
  totalPercent: number;
  /** Accessible description built by the caller. */
  label: string;
  height?: number;
};

export function SplitBar({ foodPercent, totalPercent, label, height = 12 }: Props) {
  const food = clamp(foodPercent);
  const total = clamp(totalPercent);
  // The supplement segment starts where food ends and runs to the total.
  const supplementStart = Math.min(food, 100);
  const supplementEnd = Math.min(total, 100);
  const supplementWidth = Math.max(0, supplementEnd - supplementStart);
  const overflow = Math.min(Math.max(total - 100, 0), 100);

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        position: "relative",
        height: `${height}px`,
        borderRadius: `${height / 2}px`,
        overflow: "hidden",
        // remainder: gray hatch, distinct from the teal supplement hatch
        background:
          "repeating-linear-gradient(135deg, rgba(106,119,118,0.35) 0 3px, transparent 3px 7px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: `${Math.min(food, 100)}%`,
          background: "var(--color-primary)",
        }}
      />
      {supplementWidth > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${supplementStart}%`,
            width: `${supplementWidth}%`,
            // teal hatch on a base fill so it reads clearly at small sizes
            backgroundColor: "rgba(47,140,126,0.18)",
            backgroundImage:
              "repeating-linear-gradient(135deg, var(--color-primary) 0 2px, transparent 2px 5px)",
          }}
        />
      )}
      {overflow > 0 && (
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${overflow}%`,
            background: "var(--color-primary-deep)",
          }}
        />
      )}
    </div>
  );
}

function clamp(percent: number): number {
  return Math.max(0, percent);
}
