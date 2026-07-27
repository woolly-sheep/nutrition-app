import { formatAmount } from "./RemainingCard";
import type { FocusNutrientItem } from "../server/api/schemas/analysis";

/**
 * 重点栄養素 board (issue #34) — the 食事摂取基準(2025) 目標量(DG) nutrients
 * shown one by one, so an important nutrient is never hidden inside the
 * flower's six category averages. Three factual groups by goal direction:
 *   gain    摂りたい   fill toward the minimum, gold when reached
 *   balance バランス   a %E marker on the goal range
 *   limit   控えめに   fill toward the maximum, stays teal (never red)
 * Facts only; every headline word is a SafeWordingService label. No red,
 * no 断定 — reaching a goal is gold, everything else is calm teal/gray.
 */

const GOLD = "#c79a12";
const BAND = "#d7e8e3";

type Group = {
  key: "gain" | "balance" | "limit";
  title: string;
};

const GROUPS: readonly Group[] = [
  { key: "gain", title: "しっかり摂りたい（目標量以上）" },
  { key: "balance", title: "エネルギーの構成（%目標範囲）" },
  { key: "limit", title: "控えめに（目標量未満）" },
];

export function FocusNutrients({
  items,
}: {
  items: readonly FocusNutrientItem[];
}) {
  if (items.length === 0) {
    return null;
  }
  const groups = GROUPS.map((group) => ({
    ...group,
    rows: items.filter((item) => item.direction === group.key),
  })).filter((group) => group.rows.length > 0);

  return (
    <section style={styles.card} aria-label="重点栄養素（食事摂取基準の目標量）">
      <div style={styles.header}>
        <span style={styles.title}>重点栄養素</span>
        <span style={styles.subtitle}>食事摂取基準(2025)の目標量</span>
      </div>
      <p style={styles.intro}>
        生活習慣病予防のため国が目標量を定めた栄養素です
      </p>

      {groups.map((group, groupIndex) => (
        <div
          key={group.key}
          style={groupIndex > 0 ? styles.groupWithRule : undefined}
        >
          <p style={styles.groupTitle}>{group.title}</p>
          {group.rows.map((item) => (
            <FocusRow key={item.nutrient_code} item={item} />
          ))}
        </div>
      ))}

      <p style={styles.source}>
        出典: 日本人の食事摂取基準(2025) 目標量 · 表示は推定値です
      </p>
    </section>
  );
}

function FocusRow({ item }: { item: FocusNutrientItem }) {
  return (
    <div style={styles.row}>
      <span style={styles.name}>{item.nutrient_name}</span>
      <span style={styles.track}>{trackContent(item)}</span>
      <span style={styles.value}>{valueContent(item)}</span>
    </div>
  );
}

/** The meter fill / range band + marker for one row. */
function trackContent(item: FocusNutrientItem) {
  if (item.direction === "balance") {
    const min = item.range_min ?? 0;
    const max = item.range_max ?? 100;
    const marker = item.value === null ? null : clampPercent(item.value);
    return (
      <>
        <span
          style={{
            ...styles.band,
            left: `${clampPercent(min)}%`,
            width: `${clampPercent(max - min)}%`,
          }}
        />
        {marker !== null && (
          <span
            style={{
              ...styles.marker,
              left: `${marker}%`,
              background: item.reached ? "var(--color-primary-deep)" : "#8a8f8d",
            }}
          />
        )}
      </>
    );
  }
  // gain / limit: a fill toward the bound.
  const width = clampPercent((item.fill_ratio ?? 0) * 100);
  return (
    <span
      style={{
        ...styles.fill,
        width: `${width}%`,
        background: item.reached && item.direction === "gain" ? GOLD : "var(--color-primary)",
      }}
    />
  );
}

/** The right-hand reading — one primary figure, calm wording. */
function valueContent(item: FocusNutrientItem) {
  if (item.direction === "gain") {
    if (item.reached) {
      return (
        <span style={{ color: GOLD, fontWeight: 700 }}>
          達成 {Math.round((item.fill_ratio ?? 1) * 100)}%
        </span>
      );
    }
    return (
      <>
        あと
        <b style={{ color: "var(--color-primary-deep)" }}>
          {formatAmount(item.remaining ?? 0)}
        </b>
        {item.unit}
      </>
    );
  }

  if (item.direction === "limit") {
    if (item.reached) {
      return (
        <span style={{ color: "var(--color-primary-deep)" }}>
          目標内 {formatAmount(item.value ?? 0)}
          {item.unit}
        </span>
      );
    }
    const over = (item.value ?? 0) - (item.goal_value ?? 0);
    return (
      <span style={{ color: "var(--color-subtext)" }}>
        +{formatAmount(over)}
        {item.unit}・上回る
      </span>
    );
  }

  // balance (%E)
  if (item.value === null) {
    return <span style={{ color: "var(--color-subtext)" }}>記録待ち</span>;
  }
  const reading =
    item.status === "within_goal"
      ? "範囲内"
      : item.status === "below_goal"
        ? "下回る"
        : "上回る";
  return (
    <span
      style={{
        color: item.reached ? "var(--color-primary-deep)" : "var(--color-subtext)",
      }}
    >
      {reading} {Math.round(item.value)}%
    </span>
  );
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

const styles = {
  card: {
    background: "var(--color-surface)",
    borderRadius: "var(--radius-lg)",
    padding: "14px 16px",
    margin: "14px 0 6px",
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "8px",
  },
  title: {
    fontSize: "15px",
    fontWeight: 700,
  },
  subtitle: {
    fontSize: "11px",
    color: "var(--color-subtext)",
  },
  intro: {
    fontSize: "11.5px",
    color: "var(--color-subtext)",
    margin: "2px 0 14px",
    lineHeight: 1.5,
  },
  groupWithRule: {
    borderTop: "0.5px solid var(--color-base)",
    marginTop: "14px",
    paddingTop: "12px",
  },
  groupTitle: {
    fontSize: "11.5px",
    color: "var(--color-primary-deep)",
    fontWeight: 700,
    margin: "0 0 10px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minHeight: "32px",
  },
  name: {
    width: "72px",
    fontSize: "13px",
    flex: "none",
  },
  track: {
    position: "relative",
    flex: 1,
    height: "7px",
    background: "var(--color-base)",
    borderRadius: "var(--radius-pill)",
    boxShadow: "inset 0 0 0 1px rgba(32,42,44,0.06)",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    background: "var(--color-primary)",
    borderRadius: "var(--radius-pill)",
  },
  band: {
    position: "absolute",
    top: 0,
    height: "100%",
    background: BAND,
    borderRadius: "var(--radius-pill)",
  },
  marker: {
    position: "absolute",
    top: "-2px",
    width: "3px",
    height: "11px",
    borderRadius: "2px",
    transform: "translateX(-1.5px)",
  },
  value: {
    width: "82px",
    textAlign: "right",
    fontFamily: "var(--font-numeric)",
    fontSize: "13px",
    flex: "none",
  },
  source: {
    fontSize: "10.5px",
    color: "var(--color-subtext)",
    margin: "14px 0 0",
    lineHeight: 1.5,
  },
} satisfies Record<string, React.CSSProperties>;
