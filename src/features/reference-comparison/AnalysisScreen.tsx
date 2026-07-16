"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BulletBar } from "../../components/BulletBar";
import { formatAmount } from "../../components/RemainingCard";
import { SourceFooter } from "../../components/SourceFooter";
import { ThresholdBar } from "../../components/ThresholdBar";
import type {
  AnalysisExceedanceItem,
  AnalysisNutrientItem,
  DailyAnalysisResponse,
} from "../../server/api/schemas/analysis";
import { AGE_BAND_LABELS, SEX_LABELS } from "../daily-summary/ProfileSetup";
import { WeeklyReport } from "./WeeklyReport";

/**
 * 分析タブ・日次 (UI design v0.1 §4.3 + v0.2 addendum §3):
 * UL section (7a, hidden when empty) → RDA/AI bullet bars →
 * DG overage (6b, hidden when empty) → link to the day's records.
 */

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

export function AnalysisScreen() {
  const [data, setData] = useState<DailyAnalysisResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`/api/analysis?date=${todayIsoDate()}`);
        if (!response.ok) {
          setFailed(true);
          return;
        }
        setData((await response.json()) as DailyAnalysisResponse);
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  if (failed) {
    return (
      <p style={{ color: "var(--color-subtext)" }}>
        読み込めませんでした。再読み込みしてください。
      </p>
    );
  }
  if (data === null) {
    return <p style={{ color: "var(--color-subtext)" }}>読み込み中…</p>;
  }
  if (data.profile_required) {
    return (
      <div>
        <h1 style={styles.title}>分析</h1>
        <p style={{ color: "var(--color-subtext)", fontSize: "14px" }}>
          先にホームで比較する基準の区分を選んでください。
        </p>
        <Link href="/" style={styles.link}>
          ホームへ →
        </Link>
      </div>
    );
  }
  if (!data.has_records || data.summary === null) {
    return (
      <div>
        <h1 style={styles.title}>分析</h1>
        <p style={{ color: "var(--color-subtext)", fontSize: "14px" }}>
          {formatJapaneseDate(data.date)}の記録がまだありません。
          1食記録すると基準値との比較が表示されます。
        </p>
        <Link href={`/meals?date=${data.date}`} style={styles.link}>
          食事を記録する →
        </Link>
        <WeeklyReport date={data.date} />
        <SourceFooter sources={data.sources} />
      </div>
    );
  }

  const { summary } = data;
  const bars = [...summary.achieved, ...summary.insufficient];

  return (
    <div>
      <header>
        <p style={{ color: "var(--color-subtext)", fontSize: "13px", margin: 0 }}>
          {formatJapaneseDate(data.date)} · 食事摂取基準(2025)
          {data.profile &&
            ` · ${AGE_BAND_LABELS[data.profile.ageBand]} ${SEX_LABELS[data.profile.sex]}`}
        </p>
        <h1 style={{ ...styles.title, margin: "4px 0 0" }}>基準値との比較</h1>
      </header>

      {summary.ul_reached.length > 0 && (
        <section style={styles.ulSection}>
          <h2 style={styles.sectionTitle}>
            耐容上限量(UL)に達した項目 {summary.ul_reached.length}件
          </h2>
          {summary.ul_reached.map((item) => (
            <ExceedanceRow key={item.nutrient_code} item={item} kind="ul" />
          ))}
        </section>
      )}

      <section style={{ marginTop: "24px" }}>
        <h2 style={styles.sectionTitle}>基準値比較（推奨量・目安量）</h2>
        {bars.map((item) => (
          <NutrientBarRow key={item.nutrient_code} item={item} />
        ))}
      </section>

      {summary.dg_over.length > 0 && (
        <section style={{ marginTop: "24px" }}>
          <h2 style={styles.sectionTitle}>目標量(DG)を上回っているもの</h2>
          {summary.dg_over.map((item) => (
            <ExceedanceRow key={item.nutrient_code} item={item} kind="dg" />
          ))}
          {summary.dg_over[0]?.note && (
            <p style={styles.noteCallout}>{summary.dg_over[0].note}</p>
          )}
        </section>
      )}

      <Link href={`/meals?date=${data.date}`} style={styles.link}>
        内訳になった食事を確認 →
      </Link>

      <WeeklyReport date={data.date} />

      <SourceFooter sources={data.sources} />
    </div>
  );
}

function NutrientBarRow({ item }: { item: AnalysisNutrientItem }) {
  const percent = item.percent_of_reference ?? 0;
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={styles.rowHeader}>
        <span style={{ fontSize: "14px" }}>{item.nutrient_name}</span>
        <span style={styles.rowFigures}>
          {formatAmount(item.intake_amount)} /{" "}
          {typeof item.reference_value === "number"
            ? formatAmount(item.reference_value)
            : item.reference_value}{" "}
          {item.unit}
          {item.remaining_amount !== undefined &&
            item.remaining_amount > 0 &&
            ` · あと${formatAmount(item.remaining_amount)}${item.unit}`}
        </span>
      </div>
      <BulletBar
        percent={percent}
        label={`${item.nutrient_name} ${Math.round(percent)}%`}
      />
    </div>
  );
}

function ExceedanceRow({
  item,
  kind,
}: {
  item: AnalysisExceedanceItem;
  kind: "ul" | "dg";
}) {
  const thresholdLabel =
    kind === "ul"
      ? `UL ${formatAmount(item.threshold_value)}`
      : `目標 ${String(item.reference_value)}/日`;
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={styles.rowHeader}>
        <span style={{ fontSize: "14px" }}>{item.nutrient_name}</span>
        <span style={styles.rowFigures}>
          {formatAmount(item.intake_amount)} / {thresholdLabel} {item.unit}
        </span>
      </div>
      <p
        style={{
          margin: "2px 0 4px",
          fontFamily: "var(--font-numeric)",
          fontSize: "16px",
          fontWeight: 700,
        }}
      >
        {kind === "ul" ? "上限" : "目標"}より +{formatAmount(item.over_amount)}
        {item.unit}
      </p>
      <ThresholdBar
        percentOfThreshold={item.percent_of_threshold}
        label={`${item.nutrient_name} ${kind === "ul" ? "UL" : "目標"}比 ${Math.round(item.percent_of_threshold)}%`}
      />
      {item.meal_breakdown.length > 0 && (
        <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--color-subtext)" }}>
          内訳の上位:{" "}
          {item.meal_breakdown
            .slice(0, 3)
            .map(
              (entry) =>
                `${MEAL_TYPE_LABELS[entry.meal_type] ?? entry.meal_type} ${formatAmount(entry.amount)}${item.unit}`,
            )
            .join(" · ")}
        </p>
      )}
      <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
        {item.label}。{kind === "ul" && item.note ? item.note : ""}
      </p>
    </div>
  );
}

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatJapaneseDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

const styles = {
  title: { fontSize: "20px", margin: 0 },
  sectionTitle: { fontSize: "15px", margin: "0 0 10px" },
  ulSection: {
    marginTop: "20px",
    padding: "12px",
    border: "1px solid var(--color-text)",
    borderRadius: "10px",
  },
  rowHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "8px",
    marginBottom: "4px",
  },
  rowFigures: { color: "var(--color-subtext)", fontSize: "12px" },
  noteCallout: {
    marginTop: "8px",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "var(--color-surface)",
    fontSize: "12px",
    lineHeight: 1.7,
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "var(--tap-target-min)",
    marginTop: "12px",
    color: "var(--color-primary)",
    fontWeight: 700,
    textDecoration: "none",
  },
} satisfies Record<string, React.CSSProperties>;
