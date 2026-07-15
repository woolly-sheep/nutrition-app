/**
 * UL/DG threshold bar (UI design v0.2 addendum §2): intake = green fill,
 * threshold = ink vertical marker, amount past the threshold = ink
 * crosshatch. Deliberately distinct from deep green (>100% of RDA/AI)
 * and from any warning color — red stays banned.
 */

type Props = {
  /** intake ÷ threshold × 100 */
  percentOfThreshold: number;
  /** Accessible description, e.g. "ビタミンA UL比 115%" */
  label: string;
};

export function ThresholdBar({ percentOfThreshold, label }: Props) {
  const percent = Math.max(0, percentOfThreshold);
  // Scale so the threshold sits at 70% of the bar width when exceeded,
  // keeping the overshoot visible without an open-ended axis.
  const thresholdPosition = percent > 100 ? 70 : 100;
  const fillWidth = Math.min((percent / 100) * thresholdPosition, 100);

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        position: "relative",
        height: "10px",
        borderRadius: "5px",
        background: "var(--color-surface)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: `${Math.min(fillWidth, thresholdPosition)}%`,
          background: "var(--color-primary)",
          borderRadius: "5px 0 0 5px",
        }}
      />
      {fillWidth > thresholdPosition && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${thresholdPosition}%`,
            width: `${fillWidth - thresholdPosition}%`,
            background:
              "repeating-linear-gradient(135deg, var(--color-text) 0 3px, transparent 3px 7px)",
          }}
        />
      )}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-3px",
          bottom: "-3px",
          left: `${thresholdPosition}%`,
          width: "2px",
          background: "var(--color-text)",
        }}
      />
    </div>
  );
}
