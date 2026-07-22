"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AchievementBadge } from "../../components/AchievementBadge";
import { BloomFlower } from "../../components/BloomFlower";
import { EmptyState } from "../../components/EmptyState";
import { WeekGarden } from "../../components/WeekGarden";
import { formatAmount } from "../../components/RemainingCard";
import { SourceFooter } from "../../components/SourceFooter";
import { buildBloomModel } from "../../domain/analysis/nutrientGroups";
import { buildWeekGarden, type GardenDay } from "../../domain/analysis/weekGarden";
import type {
  DailyAnalysisResponse,
  WeeklyAnalysisResponse,
} from "../../server/api/schemas/analysis";
import type { FoodCandidatesResponse } from "../../server/api/handlers/getFoodCandidates";
import { AGE_BAND_LABELS, ProfileSetup, SEX_LABELS } from "./ProfileSetup";

/**
 * Home daily summary — 栄養バランスの花 (UI redesign 2026-07-22):
 * a bloom hero (6 nutrient groups) with the day's overall fulfilment in the
 * centre, a week garden (habit, no wilt), achievements first, then top
 * shortfalls as thin bars with a fact-only "next bite" nudge. One primary
 * figure; exact numbers stay compact (progressive disclosure).
 */

const TOP_SHORTFALLS = 2;

export function DailySummaryScreen() {
  const [data, setData] = useState<DailyAnalysisResponse | null>(null);
  const [garden, setGarden] = useState<readonly GardenDay[]>([]);
  const [candidates, setCandidates] = useState<FoodCandidatesResponse | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const today = todayIsoDate();
    try {
      const response = await fetch(`/api/analysis?date=${today}`);
      if (!response.ok) {
        setFailed(true);
        return;
      }
      setData((await response.json()) as DailyAnalysisResponse);
      setFailed(false);
    } catch {
      setFailed(true);
      return;
    }
    // Supplementary — the summary still renders if these fail.
    try {
      const [weeklyRes, candidatesRes] = await Promise.all([
        fetch(`/api/analysis?period=weekly&date=${today}`),
        fetch(`/api/analysis/candidates?date=${today}`),
      ]);
      if (weeklyRes.ok) {
        const weekly = (await weeklyRes.json()) as WeeklyAnalysisResponse;
        setGarden(buildWeekGarden(weekly, today));
      }
      if (candidatesRes.ok) {
        setCandidates((await candidatesRes.json()) as FoodCandidatesResponse);
      }
    } catch {
      // keep the core summary
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
  const comparable = [...summary.achieved, ...summary.insufficient];
  const overLimitCodes = new Set(summary.ul_reached.map((i) => i.nutrient_code));
  const bloom = buildBloomModel(comparable, overLimitCodes);
  const topShortfalls = summary.insufficient.slice(0, TOP_SHORTFALLS);
  const restCount = Math.max(summary.insufficient.length - TOP_SHORTFALLS, 0);
  const watchItems = [
    ...summary.ul_reached.map((item) => ({ item, kind: "ul" as const })),
    ...summary.dg_over.map((item) => ({ item, kind: "dg" as const })),
  ];

  return (
    <div>
      <header>
        <p style={{ color: "var(--color-subtext)", fontSize: "13px", margin: 0 }}>
          {formatJapaneseDate(data.date)} · 食事摂取基準(2025)との比較
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "2px" }}>
          <h1 style={{ fontSize: "20px", margin: 0 }}>今日の栄養</h1>
          {data.profile && (
            <span style={{ color: "var(--color-subtext)", fontSize: "12px" }}>
              {AGE_BAND_LABELS[data.profile.ageBand]} {SEX_LABELS[data.profile.sex]}
            </span>
          )}
        </div>
      </header>

      <section style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
        <BloomFlower petals={bloom.petals} overall={bloom.overall} />
      </section>
      <p style={{ textAlign: "center", color: "var(--color-subtext)", fontSize: "12px", margin: "0 0 4px" }}>
        長い花びらほど基準に近い推定 ·{" "}
        <span style={{ color: "#c79a12" }}>ゴールド＝目標到達</span>
      </p>

      {garden.length > 0 && (
        <section style={{ marginTop: "16px" }}>
          <h2 style={styles.sectionTitle}>今週の庭</h2>
          <WeekGarden days={garden} />
          <p style={{ color: "var(--color-subtext)", fontSize: "11px", margin: "8px 0 0" }}>
            記録した日はつぼみが開きます。空いた日は明日のつぼみ。
          </p>
        </section>
      )}

      <section style={{ marginTop: "20px" }}>
        <h2 style={styles.sectionTitle}>できていること</h2>
        <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
          {summary.comparable_count}項目中{summary.at_least_80_count}項目が80%以上
          {summary.within_goal_count > 0 && ` · 目標圏内 ${summary.within_goal_count}項目`}
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
        <h2 style={styles.sectionTitle}>あと少し</h2>
        {summary.insufficient.length === 0 ? (
          <p style={{ color: "var(--color-subtext)", fontSize: "14px" }}>
            比較対象の項目はすべて基準値に達している推定です。
          </p>
        ) : (
          <>
            {topShortfalls.map((item) => {
              const nudge = candidateFor(candidates, item.nutrient_code);
              return (
                <div key={item.nutrient_code} style={{ marginBottom: "10px" }}>
                  <div style={styles.shortfallRow}>
                    <span style={{ width: "88px", fontSize: "14px" }}>{item.nutrient_name}</span>
                    <div style={styles.track}>
                      <div
                        style={{
                          ...styles.fill,
                          width: `${Math.min(item.percent_of_reference ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                    <span style={styles.remaining}>
                      あと<b style={{ color: "var(--color-primary-deep)" }}>
                        {formatAmount(item.remaining_amount ?? 0)}
                      </b>
                      {item.unit}
                    </span>
                  </div>
                  {nudge && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                      <Link
                        href={`/meals?add=${encodeURIComponent(nudge.food_id)}`}
                        style={styles.nudge}
                        aria-label={`${nudge.display_name}を記録に追加`}
                      >
                        ＋ {nudge.display_name}{" "}
                        {nudge.portion_label ?? `約${Math.round(nudge.portion_g)}g`}
                        で基準値の約{Math.round(nudge.percent_of_shortfall)}%
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
            {restCount > 0 && (
              <p style={{ color: "var(--color-subtext)", fontSize: "13px", margin: "6px 0 0" }}>
                他の不足 {restCount}件は分析タブで確認できます。
              </p>
            )}
            {candidates?.notice && (
              <p style={{ color: "var(--color-subtext)", fontSize: "11px", margin: "8px 0 0" }}>
                {candidates.notice}
              </p>
            )}
          </>
        )}
      </section>

      {watchItems.length > 0 && (
        <section style={styles.watchSection}>
          <h2 style={styles.sectionTitle}>気をつけたい</h2>
          {watchItems.map(({ item, kind }) => {
            const isEnergyRatio = item.unit === "%E";
            return (
              <div key={`${kind}-${item.nutrient_code}`} style={styles.watchRow}>
                <span style={{ fontSize: "14px" }}>{item.nutrient_name}</span>
                <span style={{ fontSize: "13px", color: "var(--color-subtext)" }}>
                  {kind === "ul" ? "上限" : isEnergyRatio ? "目標範囲" : "目標"}より +
                  {formatAmount(item.over_amount)}
                  {isEnergyRatio ? "pt" : item.unit}（推定）
                </span>
              </div>
            );
          })}
          <Link href={`/analysis`} style={styles.watchLink}>
            分析タブで内訳を見る →
          </Link>
        </section>
      )}

      <Link href="/meals" style={styles.cta}>
        食事を記録する →
      </Link>

      <SourceFooter sources={data.sources} />
    </div>
  );
}

function candidateFor(
  candidates: FoodCandidatesResponse | null,
  nutrientCode: string,
) {
  if (!candidates?.has_analysis) {
    return null;
  }
  return (
    candidates.candidates.find((c) => c.target_nutrient_code === nutrientCode) ??
    null
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
    margin: "0 0 10px",
  },
  shortfallRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  track: {
    flex: 1,
    height: "6px",
    background: "var(--color-surface)",
    borderRadius: "999px",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    background: "var(--color-primary)",
    borderRadius: "999px",
  },
  remaining: {
    width: "88px",
    textAlign: "right",
    fontFamily: "var(--font-numeric)",
    fontSize: "14px",
  },
  nudge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "var(--tap-target-min)",
    background: "var(--color-surface)",
    color: "var(--color-primary-deep)",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    textDecoration: "none",
  },
  watchSection: {
    marginTop: "24px",
    padding: "14px 16px",
    background: "var(--color-surface)",
    borderRadius: "12px",
  },
  watchRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "8px",
    padding: "5px 0",
  },
  watchLink: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "var(--tap-target-min)",
    color: "var(--color-primary-deep)",
    fontSize: "13px",
    textDecoration: "none",
  },
  cta: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "var(--tap-target-min)",
    marginTop: "20px",
    color: "var(--color-primary)",
    fontWeight: 700,
    textDecoration: "none",
  },
} satisfies Record<string, React.CSSProperties>;
