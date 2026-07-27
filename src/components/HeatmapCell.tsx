/**
 * Weekly heatmap cell (5c). #91 grades the fill by fulfilment — a continuous
 * teal density (capped at 100% so an overshoot never looks "more done") in
 * place of the old 3-state (<50 hatch / 50–99 blank / ≥100 mint) which made a
 * whole week of 50–99% read identically. Redundant coding is kept so no reading
 * depends on colour alone: number = %, ✓ = achieved (≥100%), hatch = below 50%,
 * "–" = no records that day.
 */

const HATCH =
  "repeating-linear-gradient(135deg, rgba(106,119,118,0.25) 0 2px, transparent 2px 6px)";

type Props = {
  /** Fulfillment percent, or null when the day has no records. */
  percent: number | null;
};

export function HeatmapCell({ percent }: Props) {
  if (percent === null) {
    return (
      <td style={{ ...styles.cell, color: "var(--color-subtext)" }}>–</td>
    );
  }

  const achieved = percent >= 100;
  const low = percent < 50;
  // Graded teal, 0.08 → 0.58 alpha across 0–100% (capped: overshoot stays 100).
  const density = Math.min(percent, 100) / 100;
  const teal = `rgba(47, 140, 126, ${(0.08 + density * 0.5).toFixed(3)})`;
  return (
    <td
      style={{
        ...styles.cell,
        // Below 50% keeps the hatch overlaid on the (faint) teal for redundancy.
        background: low ? `${HATCH}, ${teal}` : teal,
        fontWeight: achieved ? 700 : 400,
      }}
    >
      {achieved && <span aria-hidden="true">✓</span>}
      {Math.round(percent)}
    </td>
  );
}

const styles = {
  cell: {
    padding: "6px 2px",
    textAlign: "center",
    fontSize: "11px",
    minWidth: "34px",
    borderRadius: "4px",
  },
} satisfies Record<string, React.CSSProperties>;
