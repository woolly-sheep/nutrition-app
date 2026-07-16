"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeatmapCell } from "../../components/HeatmapCell";
import type { WeeklyAnalysisResponse } from "../../server/api/schemas/analysis";

/**
 * 週次: 充足率レポート / バランスマップ (5c + 6c). Days without records
 * are excluded from averages and the exclusion is explained honestly.
 * Facts only — patterns are restatements of the records, not advice.
 */

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

type Props = {
  date: string;
};

export function WeeklyReport({ date }: Props) {
  const [data, setData] = useState<WeeklyAnalysisResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          `/api/analysis?date=${date}&period=weekly`,
        );
        if (!response.ok) {
          return;
        }
        setData((await response.json()) as WeeklyAnalysisResponse);
      } catch {
        // weekly is supplementary — the daily section already reports errors
      }
    })();
  }, [date]);

  if (data === null || data.profile_required) {
    return null;
  }
  if (data.recorded_dates.length === 0) {
    return null;
  }

  const dayCount = data.nutrients[0]?.daily.length ?? 0;
  const achievedPatterns = data.nutrients.filter(
    (nutrient) => nutrient.days_achieved > 0 && nutrient.average_percent >= 100,
  );

  return (
    <section style={{ marginTop: "32px" }}>
      <h2 style={{ fontSize: "15px", margin: "0 0 4px" }}>
        充足率レポート — 週平均
      </h2>
      <p style={styles.subtext}>
        {formatRange(data.week_start, data.week_end)} · 記録がある
        {data.recorded_dates.length}日分で算出
      </p>

      {data.missing_dates.length > 0 && (
        <div style={styles.infoCallout}>
          <p style={{ margin: 0 }}>
            {data.missing_dates.map(formatShortDate).join("・")}
            は記録がありません。この{data.missing_dates.length}
            日は平均に含めていません。0kcalとして扱うと平均が実際より低く出るためです。
          </p>
          <Link href={`/meals?date=${data.missing_dates[0]}`} style={styles.calloutLink}>
            あとから追加 →
          </Link>
        </div>
      )}

      <div style={{ overflowX: "auto", marginTop: "12px" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.nameCell} scope="col">
                <span style={{ fontWeight: 400, color: "var(--color-subtext)" }}>
                  数値=充足率%
                </span>
              </th>
              {DAY_LABELS.slice(0, dayCount).map((label) => (
                <th key={label} style={styles.dayHeader} scope="col">
                  {label}
                </th>
              ))}
              <th style={styles.dayHeader} scope="col">
                平均
              </th>
            </tr>
          </thead>
          <tbody>
            {data.nutrients.map((nutrient) => (
              <tr key={nutrient.nutrient_code}>
                <th style={styles.nameCell} scope="row">
                  {nutrient.nutrient_name}
                </th>
                {nutrient.daily.map((cell) => (
                  <HeatmapCell key={cell.date} percent={cell.percent} />
                ))}
                <td style={styles.averageCell}>
                  {Math.round(nutrient.average_percent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={styles.subtext}>数値=充足率% · ✓=達成 · 斜線=50%未満 · –=記録なし</p>

      {(data.patterns.length > 0 || achievedPatterns.length > 0) && (
        <div style={{ marginTop: "16px" }}>
          <h3 style={{ fontSize: "14px", margin: "0 0 8px" }}>
            今週のパターン（記録からの事実）
          </h3>
          <ul style={styles.patternList}>
            {data.patterns.slice(0, 3).map((pattern) => (
              <li key={pattern.nutrient_code} style={styles.patternRow}>
                {pattern.nutrient_name}: 記録{pattern.recorded_days}日中
                {pattern.days_below_50}日で50%未満
                <Link href="/meals" style={styles.inlineLink}>
                  記録を見る →
                </Link>
              </li>
            ))}
            {achievedPatterns.slice(0, 2).map((nutrient) => (
              <li key={nutrient.nutrient_code} style={styles.patternRow}>
                <span aria-hidden="true">✓ </span>
                {nutrient.nutrient_name}: {nutrient.days_achieved}
                日で100%達成（週平均{Math.round(nutrient.average_percent)}%）
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function formatRange(start: string, end: string): string {
  return `${formatShortDate(start)} − ${formatShortDate(end)}`;
}

function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][
    new Date(`${isoDate}T00:00:00Z`).getUTCDay()
  ];
  return `${Number(month)}/${Number(day)}(${weekday})`;
}

const styles = {
  subtext: {
    color: "var(--color-subtext)",
    fontSize: "12px",
    margin: "4px 0 0",
  },
  infoCallout: {
    marginTop: "12px",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "var(--color-surface)",
    fontSize: "12px",
    lineHeight: 1.7,
  },
  calloutLink: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "var(--tap-target-min)",
    color: "var(--color-primary)",
    fontWeight: 700,
    textDecoration: "none",
  },
  table: {
    borderCollapse: "separate",
    borderSpacing: "2px",
    width: "100%",
  },
  nameCell: {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 500,
    padding: "6px 4px",
    whiteSpace: "nowrap",
  },
  dayHeader: {
    fontSize: "11px",
    fontWeight: 400,
    color: "var(--color-subtext)",
    padding: "4px 2px",
  },
  averageCell: {
    textAlign: "center",
    fontSize: "11px",
    fontWeight: 700,
    padding: "6px 2px",
  },
  patternList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    fontSize: "13px",
  },
  patternRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "4px 8px",
    minHeight: "28px",
    marginBottom: "4px",
  },
  inlineLink: {
    color: "var(--color-primary)",
    fontWeight: 700,
    textDecoration: "none",
  },
} satisfies Record<string, React.CSSProperties>;
