"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SourceFooter } from "../../components/SourceFooter";
import type {
  DailyAnalysisResponse,
  NutrientTrendPoint,
  NutrientTrendsResponse,
} from "../../server/api/schemas/analysis";
import { ProfilePanel } from "../daily-summary/ProfilePanel";
import { AGE_BAND_LABELS, SEX_LABELS } from "../daily-summary/ProfileSetup";
import { BackupPanel } from "../../components/BackupPanel";
import { MonthGarden } from "../../components/MonthGarden";
import { WeeklyReport } from "./WeeklyReport";
import {
  ExceedanceRow,
  FoodUntrackedRow,
  NonFoodLimitRow,
  NutrientBarRow,
  SplitLegend,
} from "./AnalysisRows";
import { StatusSummary } from "./StatusSummary";
import { buildNutrientBarGroups } from "../../domain/analysis/nutrientStatusGroups";

/**
 * 分析タブ・日次 (UI design v0.1 §4.3 + v0.2 addendum §3):
 * status summary tally (issue #57) → UL section (7a, hidden when empty) →
 * RDA/AI bars grouped 不足を優先 → 目安圏内 → 達成 → DG overage (6b) →
 * link to the day's records. Row renderers live in AnalysisRows.
 */

export function AnalysisScreen() {
  const [data, setData] = useState<DailyAnalysisResponse | null>(null);
  const [failed, setFailed] = useState(false);
  // #92: one batch fetch of every nutrient's 7-day trend for the row sparklines.
  const [trends, setTrends] = useState<
    ReadonlyMap<string, readonly NutrientTrendPoint[]>
  >(new Map());

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

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          `/api/analysis/trends?date=${todayIsoDate()}&days=7`,
        );
        if (!response.ok) {
          return; // sparklines are supplementary — the bars still stand alone
        }
        const body = (await response.json()) as NutrientTrendsResponse;
        setTrends(
          new Map(body.nutrients.map((n) => [n.nutrient_code, n.points])),
        );
      } catch {
        // ignore — rows render without the trend
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
        <MonthGarden date={data.date} />
        <details style={{ marginTop: "24px" }}>
          <summary style={styles.backupSummary}>基準の区分（生年月日・性別）</summary>
          <div style={{ marginTop: "10px" }}>
            <ProfilePanel />
          </div>
        </details>
        <details style={{ marginTop: "12px" }}>
          <summary style={styles.backupSummary}>データのバックアップ</summary>
          <div style={{ marginTop: "10px" }}>
            <BackupPanel />
          </div>
        </details>
        <SourceFooter sources={data.sources} />
      </div>
    );
  }

  const { summary } = data;
  const barGroups = buildNutrientBarGroups({
    achieved: summary.achieved,
    insufficient: summary.insufficient,
  });
  // 上限注意 tally jumps to whichever exceedance section is shown first.
  const attentionHref =
    summary.ul_reached.length > 0
      ? "#sec-ul"
      : summary.dg_over.length > 0
        ? "#sec-dg"
        : undefined;

  return (
    <div>
      <header>
        <p style={{ color: "var(--color-subtext)", fontSize: "13px", margin: 0 }}>
          {formatJapaneseDate(data.date)} · 食事摂取基準(2025)
          {data.profile &&
            ` · ${data.profile.ageBand ? `${AGE_BAND_LABELS[data.profile.ageBand]} ` : ""}${SEX_LABELS[data.profile.sex]}`}
        </p>
        <h1 style={{ ...styles.title, margin: "4px 0 0" }}>基準値との比較</h1>
      </header>

      <StatusSummary
        comparableCount={summary.comparable_count}
        atLeast80Count={summary.at_least_80_count}
        achievedCount={summary.achieved.length}
        ulReachedCount={summary.ul_reached.length}
        dgOverCount={summary.dg_over.length}
        hrefs={{
          short: "#grp-short",
          near: "#grp-near",
          achieved: "#grp-achieved",
          attention: attentionHref,
        }}
      />

      {summary.ul_reached.length > 0 && (
        <section id="sec-ul" style={styles.ulSection}>
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
        <p style={styles.tapHint}>栄養素をタップすると食材別の内訳が開きます。</p>
        {data.has_supplements && <SplitLegend />}
        {barGroups.map((group) => (
          <div key={group.status} id={`grp-${group.status}`}>
            <h3 style={styles.groupHeader}>
              <span>{group.label}</span>
              <span style={styles.groupCount}>{group.items.length}</span>
            </h3>
            {group.items.map((item) => (
              <NutrientBarRow
                key={item.nutrient_code}
                item={item}
                date={data.date}
                trend={trends.get(item.nutrient_code)}
              />
            ))}
          </div>
        ))}
      </section>

      {summary.non_food_limits.length > 0 && (
        <section style={styles.nonFoodSection}>
          <h2 style={styles.sectionTitle}>
            サプリからの摂取（通常の食品以外の上限量）
          </h2>
          {summary.non_food_limits.map((item) => (
            <NonFoodLimitRow key={item.nutrient_code} item={item} />
          ))}
          {summary.non_food_limits[0]?.note && (
            <p style={styles.noteCallout}>{summary.non_food_limits[0].note}</p>
          )}
        </section>
      )}

      {summary.food_untracked.length > 0 && (
        <section style={{ marginTop: "24px" }}>
          <h2 style={styles.sectionTitle}>
            サプリからの摂取（食品は未追跡）
          </h2>
          {summary.food_untracked.map((item) => (
            <FoodUntrackedRow key={item.nutrient_code} item={item} />
          ))}
          {summary.food_untracked[0]?.note && (
            <p style={styles.noteCallout}>{summary.food_untracked[0].note}</p>
          )}
        </section>
      )}

      {summary.dg_over.length > 0 && (
        <section id="sec-dg" style={{ marginTop: "24px" }}>
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

      <MonthGarden date={data.date} />

      <details style={{ marginTop: "24px" }}>
        <summary style={styles.backupSummary}>基準の区分（生年月日・性別）</summary>
        <div style={{ marginTop: "10px" }}>
          <ProfilePanel />
        </div>
      </details>

      <details style={{ marginTop: "12px" }}>
        <summary style={styles.backupSummary}>データのバックアップ</summary>
        <div style={{ marginTop: "10px" }}>
          <BackupPanel />
        </div>
      </details>

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
  title: { fontSize: "20px", margin: 0 },
  sectionTitle: { fontSize: "15px", margin: "0 0 10px" },
  groupHeader: {
    position: "sticky" as const,
    top: 0,
    zIndex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "8px",
    margin: "18px 0 10px",
    padding: "6px 0",
    background: "var(--color-base)",
    borderBottom: "1px solid var(--color-surface)",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "var(--color-subtext)",
  },
  groupCount: {
    fontFamily: "var(--font-numeric)",
    color: "var(--color-primary-deep)",
    fontSize: "13px",
  },
  backupSummary: {
    minHeight: "var(--tap-target-min)",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontSize: "14px",
    color: "var(--color-primary)",
    fontWeight: 700,
  },
  ulSection: {
    marginTop: "20px",
    padding: "12px",
    border: "1px solid var(--color-text)",
    borderRadius: "var(--radius-md)",
  },
  nonFoodSection: {
    marginTop: "20px",
    padding: "12px",
    border: "1px solid var(--color-text)",
    borderRadius: "var(--radius-md)",
  },
  tapHint: {
    fontSize: "12px",
    color: "var(--color-subtext)",
    margin: "0 0 10px",
  },
  noteCallout: {
    marginTop: "8px",
    padding: "10px 12px",
    borderRadius: "var(--radius-md)",
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
