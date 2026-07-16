/**
 * 5a semantics bar: intake = primary green fill, remainder = gray hatch
 * pattern (not a color), overflow past 100% = deep green. No red, no gold
 * in the fill — achievement gold is reserved for badges/chips.
 */

type Props = {
  /** intake ÷ reference × 100 */
  percent: number;
  /** Accessible description, e.g. "ビタミンD 45%" */
  label: string;
  /** Bar thickness; compact rows use a thinner bar (v0.4 §1). */
  height?: number;
};

export function BulletBar({ percent, label, height = 10 }: Props) {
  const clamped = Math.max(0, percent);
  const fillPercent = Math.min(clamped, 100);
  const overflowPercent = Math.min(Math.max(clamped - 100, 0), 100);

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        position: "relative",
        height: `${height}px`,
        borderRadius: `${height / 2}px`,
        overflow: "hidden",
        // remainder: hatched pattern, readable without color vision
        background:
          "repeating-linear-gradient(135deg, rgba(106,119,118,0.35) 0 3px, transparent 3px 7px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: `${fillPercent}%`,
          background: "var(--color-primary)",
        }}
      />
      {overflowPercent > 0 && (
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${overflowPercent}%`,
            background: "var(--color-primary-deep)",
          }}
        />
      )}
    </div>
  );
}
