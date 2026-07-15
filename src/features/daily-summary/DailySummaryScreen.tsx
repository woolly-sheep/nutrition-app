"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AchievementBadge } from "../../components/AchievementBadge";
import { EmptyState } from "../../components/EmptyState";
import { RemainingCard, formatAmount } from "../../components/RemainingCard";
import { SourceFooter } from "../../components/SourceFooter";
import type { DailyAnalysisResponse } from "../../server/api/schemas/analysis";
import { AGE_BAND_LABELS, ProfileSetup, SEX_LABELS } from "./ProfileSetup";

/**
 * Home daily summary (UI design §4.1 / exploration 5b):
 * achievements first, shortfalls top-2 + collapsed rest, single primary
 * figure 「あと◯◯」, one-tap link to the record tab.
 */

const TOP_SHORTFALLS = 2;

export function DailySummaryScreen() {
  const [data, setData] = useState<DailyAnalysisResponse | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/analysis?date=${todayIsoDate()}`);
      if (!response.ok) {
        setFailed(true);
        return;
      }
      setData((await response.json()) as DailyAnalysisResponse);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    return <ProfileSetup disclaimer={data.disclaimer} onSaved={() => void load()} />;
  }
  if (!data.has_records || data.summary === null) {
    return (
      <div>
        <EmptyState dateLabel={formatJapaneseDate(data.date)} />
        <SourceFooter sources={data.sources} />
      </div>
    );
  }

  const { summary } = data;
  const topShortfalls = summary.insufficient.slice(0, TOP_SHORTFALLS);
  const restShortfalls = summary.insufficient.slice(TOP_SHORTFALLS);

  return (
    <div>
      <header>
        <p style={{ color: "var(--color-subtext)", fontSize: "13px", margin: 0 }}>
          {formatJapaneseDate(data.date)} · 食事摂取基準(2025)との比較
        </p>
        <h1 style={{ fontSize: "20px", margin: "4px 0 0" }}>今日の栄養</h1>
        {data.profile && (
          <p style={{ color: "var(--color-subtext)", fontSize: "12px", margin: "4px 0 0" }}>
            区分: {AGE_BAND_LABELS[data.profile.ageBand]}{" "}
            {SEX_LABELS[data.profile.sex]}
          </p>
        )}
      </header>

      <section style={{ marginTop: "20px" }}>
        <h2 style={styles.sectionTitle}>できていること</h2>
        <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
          {summary.comparable_count}項目中{summary.at_least_80_count}項目が80%以上
          {summary.within_goal_count > 0 &&
            ` · 目標圏内 ${summary.within_goal_count}項目`}
        </p>
        {summary.achieved.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {summary.achieved.map((item) => (
              <AchievementBadge
                key={item.nutrient_code}
                text={`${item.nutrient_name} ${Math.round(item.percent_of_reference ?? 0)}%`}
              />
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: "24px" }}>
        <h2 style={styles.sectionTitle}>足りていないもの（不足が大きい順）</h2>
        {summary.insufficient.length === 0 ? (
          <p style={{ color: "var(--color-subtext)", fontSize: "14px" }}>
            比較対象の項目はすべて基準値に達している推定です。
          </p>
        ) : (
          <>
            {topShortfalls.map((item) => (
              <RemainingCard
                key={item.nutrient_code}
                nutrientName={item.nutrient_name}
                unit={item.unit}
                intakeAmount={item.intake_amount}
                referenceValue={
                  typeof item.reference_value === "number"
                    ? item.reference_value
                    : 0
                }
                remainingAmount={item.remaining_amount ?? 0}
                percent={item.percent_of_reference ?? 0}
              />
            ))}
            {restShortfalls.length > 0 && (
              <details>
                <summary
                  style={{
                    minHeight: "var(--tap-target-min)",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "var(--color-subtext)",
                  }}
                >
                  他の不足 {restShortfalls.length}件 —{" "}
                  {restShortfalls[0].nutrient_name} あと
                  {formatAmount(restShortfalls[0].remaining_amount ?? 0)}
                  {restShortfalls[0].unit} ▾
                </summary>
                {restShortfalls.map((item) => (
                  <RemainingCard
                    key={item.nutrient_code}
                    nutrientName={item.nutrient_name}
                    unit={item.unit}
                    intakeAmount={item.intake_amount}
                    referenceValue={
                      typeof item.reference_value === "number"
                        ? item.reference_value
                        : 0
                    }
                    remainingAmount={item.remaining_amount ?? 0}
                    percent={item.percent_of_reference ?? 0}
                  />
                ))}
              </details>
            )}
          </>
        )}
      </section>

      <Link
        href="/meals"
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "var(--tap-target-min)",
          marginTop: "16px",
          color: "var(--color-primary)",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        今日の記録を確認する →
      </Link>

      <SourceFooter sources={data.sources} />
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
  sectionTitle: {
    fontSize: "15px",
    margin: "0 0 8px",
  },
} satisfies Record<string, React.CSSProperties>;
