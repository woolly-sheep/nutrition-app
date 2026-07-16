/**
 * %E-range DG bar (6b / UI design v0.6 addendum): hatched band =
 * goal range, green inner bar = estimated share, ink crosshatch =
 * amount past the range max, ink lines = range bounds. No red.
 */

type Props = {
  /** Estimated energy share (%E). */
  value: number;
  rangeMin: number;
  rangeMax: number;
  /** Accessible description, e.g. "脂質 33%E（目標 20〜30%E）" */
  label: string;
};

export function RangeBar({ value, rangeMin, rangeMax, label }: Props) {
  const axisMax = Math.max(rangeMax * 1.35, value * 1.1);
  const position = (amount: number) => (Math.max(amount, 0) / axisMax) * 100;

  const fillEnd = position(Math.min(value, rangeMax));
  const overStart = position(rangeMax);
  const overEnd = position(value);

  return (
    <div>
      <div
        role="img"
        aria-label={label}
        style={{
          position: "relative",
          height: "12px",
          borderRadius: "6px",
          background: "var(--color-base)",
          border: "1px solid var(--color-surface)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${position(rangeMin)}%`,
            width: `${position(rangeMax) - position(rangeMin)}%`,
            background:
              "repeating-linear-gradient(135deg, rgba(106,119,118,0.3) 0 3px, transparent 3px 7px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "3px",
            bottom: "3px",
            left: 0,
            width: `${fillEnd}%`,
            background: "var(--color-primary)",
            borderRadius: "3px",
          }}
        />
        {value > rangeMax && (
          <div
            style={{
              position: "absolute",
              top: "3px",
              bottom: "3px",
              left: `${overStart}%`,
              width: `${overEnd - overStart}%`,
              background:
                "repeating-linear-gradient(135deg, var(--color-text) 0 3px, transparent 3px 6px)",
            }}
          />
        )}
        {[rangeMin, rangeMax].map((bound) => (
          <div
            key={bound}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-3px",
              bottom: "-3px",
              left: `${position(bound)}%`,
              width: "2px",
              background: "var(--color-text)",
            }}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          height: "16px",
          fontSize: "10px",
          color: "var(--color-subtext)",
        }}
      >
        <span style={{ position: "absolute", left: `${position(rangeMin)}%`, transform: "translateX(-50%)" }}>
          {rangeMin}%
        </span>
        <span style={{ position: "absolute", left: `${position(rangeMax)}%`, transform: "translateX(-50%)" }}>
          {rangeMax}%
        </span>
      </div>
    </div>
  );
}
