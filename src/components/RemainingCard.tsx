import { BulletBar } from "./BulletBar";

/**
 * Shortfall card (5b): single primary figure 「あと◯◯」 in the numeric
 * serif face + one auxiliary figure (摂取/基準). Food-equivalent chips
 * are P2 (RecommendationCandidateService) and intentionally absent.
 */

type Props = {
  nutrientName: string;
  unit: string;
  intakeAmount: number;
  referenceValue: number;
  remainingAmount: number;
  percent: number;
};

export function RemainingCard({
  nutrientName,
  unit,
  intakeAmount,
  referenceValue,
  remainingAmount,
  percent,
}: Props) {
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "10px",
        border: "1px solid var(--color-surface)",
        marginBottom: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "8px",
        }}
      >
        <span style={{ fontWeight: 500 }}>{nutrientName}</span>
        <span style={{ color: "var(--color-subtext)", fontSize: "13px" }}>
          {formatAmount(intakeAmount)} / {formatAmount(referenceValue)} {unit}
        </span>
      </div>
      <p
        style={{
          margin: "6px 0 8px",
          fontFamily: "var(--font-numeric)",
          fontSize: "22px",
          fontWeight: 700,
        }}
      >
        あと {formatAmount(remainingAmount)} {unit}
      </p>
      <BulletBar
        percent={percent}
        label={`${nutrientName} ${Math.round(percent)}%`}
      />
    </div>
  );
}

export function formatAmount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
