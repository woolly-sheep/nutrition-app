/**
 * Weekly heatmap cell (5c): redundant coding so no reading depends on
 * color alone — number = fulfillment %, ✓ = achieved (>=100%),
 * hatch pattern = below 50%, "–" = no records that day.
 */

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
  return (
    <td
      style={{
        ...styles.cell,
        background: low
          ? "repeating-linear-gradient(135deg, rgba(106,119,118,0.25) 0 2px, transparent 2px 6px)"
          : achieved
            ? "var(--color-surface)"
            : "transparent",
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
