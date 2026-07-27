"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AchievementBadge } from "../../components/AchievementBadge";
import { BloomFlower } from "../../components/BloomFlower";
import { EmptyState } from "../../components/EmptyState";
import { FocusNutrients } from "../../components/FocusNutrients";
import { WeekGarden } from "../../components/WeekGarden";
import { SourceFooter } from "../../components/SourceFooter";
import { buildBloomModel } from "../../domain/analysis/nutrientGroups";
import { buildDailyHeadline } from "../../domain/analysis/summaryHeadline";
import { buildWeekGarden, type GardenDay } from "../../domain/analysis/weekGarden";
import type {
  DailyAnalysisResponse,
  WeeklyAnalysisResponse,
} from "../../server/api/schemas/analysis";
import type { FoodCandidatesResponse } from "../../server/api/handlers/getFoodCandidates";
import { StatusSummary } from "../reference-comparison/StatusSummary";
import { AGE_BAND_LABELS, ProfileSetup, SEX_LABELS } from "./ProfileSetup";
import { ShortfallRow } from "./ShortfallRow";
import { OverCauseRow } from "./OverCauseRow";

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
  const headline = buildDailyHeadline({
    comparableCount: summary.comparable_count,
    atLeast80Count: summary.at_least_80_count,
    topShortfallName: summary.insufficient[0]?.nutrient_name ?? null,
    ulReachedNames: summary.ul_reached.map((item) => item.nutrient_name),
    dgOverNames: summary.dg_over.map((item) => item.nutrient_name),
  });
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
              {data.profile.ageBand ? `${AGE_BAND_LABELS[data.profile.ageBand]} ` : ""}
              {SEX_LABELS[data.profile.sex]}
            </span>
          )}
        </div>
      </header>

      <p style={styles.headline}>
        <span style={styles.headlineDot} aria-hidden="true" />
        <span>{headline}</span>
      </p>

      <section style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
        <BloomFlower petals={bloom.petals} overall={bloom.overall} />
      </section>
      <p style={{ textAlign: "center", color: "var(--color-subtext)", fontSize: "12px", margin: "0 0 4px" }}>
        長い花びらほど基準に近い推定 ·{" "}
        <span style={{ color: "#c79a12" }}>✓（ゴールド）＝目標到達</span>
      </p>

      {/* #74: same tally + vocabulary as the 分析タブ so both screens
          reconcile — home is a simplified view, not a second taxonomy. */}
      <StatusSummary
        comparableCount={summary.comparable_count}
        atLeast80Count={summary.at_least_80_count}
        achievedCount={summary.achieved.length}
        ulReachedCount={summary.ul_reached.length}
        dgOverCount={summary.dg_over.length}
        hrefs={{
          short: "#home-short",
          near: "#home-short",
          achieved: "#home-done",
          attention: "#home-watch",
        }}
      />

      {/* #76: the day's own status (今日の状態) sits directly under the tiles
          it links to; the reference board and habit garden follow as detail. */}
      <section id="home-done" style={styles.card}>
        <h2 style={styles.sectionTitle}>できていること</h2>
        <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
          {summary.comparable_count}項目中{summary.at_least_80_count}項目が80%以上
          {summary.within_goal_count > 0 && ` · 目標圏内 ${summary.within_goal_count}項目`}
        </p>
        {summary.achieved.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {summary.achieved.map((item) => (
              // #75: the ✓ gold chip already means 達成 (≥基準値). Showing the
              // raw multiplier (e.g. 514%) celebrated over-supply and implied
              // "more is better" — against the fact-only stance. The exact
              // intake vs reference stays available on the 分析タブ bars.
              <AchievementBadge
                key={item.nutrient_code}
                text={`${item.nutrient_name} 達成`}
              />
            ))}
          </div>
        )}
      </section>

      <section id="home-short" style={styles.card}>
        <h2 style={styles.sectionTitle}>あと少し</h2>
        {summary.insufficient.length === 0 ? (
          <p style={{ color: "var(--color-subtext)", fontSize: "14px" }}>
            比較対象の項目はすべて基準値に達している推定です。
          </p>
        ) : (
          <>
            {topShortfalls.map((item, index) => (
              <ShortfallRow
                key={item.nutrient_code}
                item={item}
                nudge={candidateFor(candidates, item.nutrient_code)}
                date={data.date}
                showTrend={index === 0}
              />
            ))}
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
        <section id="home-watch" style={styles.watchSection}>
          <h2 style={styles.sectionTitle}>気をつけたい</h2>
          {watchItems.map(({ item, kind }) => (
            <OverCauseRow
              key={`${kind}-${item.nutrient_code}`}
              item={item}
              kind={kind}
              date={data.date}
            />
          ))}
          <Link href={`/analysis`} style={styles.watchLink}>
            分析タブで詳しく見る →
          </Link>
        </section>
      )}

      <FocusNutrients items={summary.focus_nutrients} />

      {garden.length > 0 && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>今週の庭</h2>
          <WeekGarden days={garden} />
          <p style={{ color: "var(--color-subtext)", fontSize: "11px", margin: "8px 0 0" }}>
            記録した日はつぼみが開きます。空いた日は明日のつぼみ。
          </p>
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
  // #89: unify the depth language. The mint callout was flat while the white
  // cards below carried a shadow; give this surface the same hairline + rest
  // elevation so mint and white panels obey one rule.
  headline: {
    display: "flex",
    gap: "9px",
    alignItems: "flex-start",
    margin: "14px 0 6px",
    padding: "12px 14px",
    background: "var(--color-surface)",
    borderRadius: "var(--radius-lg)",
    border: "var(--border-hairline)",
    boxShadow: "var(--elev-rest)",
    fontSize: "13.5px",
    lineHeight: 1.5,
  },
  headlineDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "var(--color-primary)",
    marginTop: "6px",
    flex: "none",
  },
  sectionTitle: {
    fontSize: "15px",
    margin: "0 0 10px",
  },
  // #59: shared card-depth treatment for the home sections.
  card: {
    marginTop: "16px",
    padding: "16px",
    background: "var(--color-base)",
    border: "1px solid var(--color-surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--elev-raised)",
    scrollMarginTop: "16px",
  },
  watchSection: {
    marginTop: "16px",
    padding: "16px",
    background: "var(--color-surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--elev-raised)",
    scrollMarginTop: "16px",
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
