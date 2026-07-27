/**
 * 5a semantics bar: intake = primary green fill, remainder = gray hatch
 * pattern (not a color), overflow past 100% = deep green. No red, no gold
 * in the fill — achievement gold is reserved for badges/chips.
 *
 * #93: opt-in reference ticks let the comparison rows show "how far to go"
 * without reading the figures — a firm mark at 100% (the goal) and a fainter
 * one at 80% (目安圏内 boundary). No warning colour; ticks are neutral marks.
 */

type Props = {
  /** intake ÷ reference × 100 */
  percent: number;
  /** Accessible description, e.g. "ビタミンD 45%" */
  label: string;
  /** Bar thickness; compact rows use a thinner bar (v0.4 §1). */
  height?: number;
  /** Draw reference ticks at 80% and 100% (analysis comparison rows). */
  showTicks?: boolean;
};

export function BulletBar({ percent, label, height = 10, showTicks = false }: Props) {
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
        className="bar-fill-animate"
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: `${fillPercent}%`,
          background:
            "linear-gradient(90deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 62%, #ffffff))",
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
      {showTicks && (
        <>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "80%",
              width: "1px",
              background: "rgba(32, 42, 44, 0.28)",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "calc(100% - 1.5px)",
              width: "1.5px",
              background: "var(--color-primary-deep)",
              opacity: 0.8,
            }}
          />
        </>
      )}
    </div>
  );
}
