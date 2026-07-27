"use client";

import { buildStatusTally } from "../../domain/analysis/nutrientStatusGroups";

/**
 * 状態サマリー (issue #57). Four counts before the detail so the day reads at
 * a glance: 不足 / 目安圏内 / 達成 / 上限注意. Shared by the 分析タブ and the
 * home 今日の栄養 so both screens speak one vocabulary with reconciling counts
 * (#74) — the tally is the single source of truth. Each tile jumps to its
 * section (per-screen anchors via `hrefs`). 不足 and 上限注意 carry a stronger
 * border to signal where attention goes — no red, no gold (accent stays
 * achievement-only). Facts only; the counts come straight from the analysis.
 */
export type StatusHrefs = {
  short?: string;
  near?: string;
  achieved?: string;
  attention?: string;
};

export function StatusSummary({
  comparableCount,
  atLeast80Count,
  achievedCount,
  ulReachedCount,
  dgOverCount,
  hrefs,
}: {
  comparableCount: number;
  atLeast80Count: number;
  achievedCount: number;
  ulReachedCount: number;
  dgOverCount: number;
  /** Per-screen anchor targets for each tile; a tile links only when set. */
  hrefs?: StatusHrefs;
}) {
  const tally = buildStatusTally({
    comparableCount,
    atLeast80Count,
    achievedCount,
    ulReachedCount,
    dgOverCount,
  });

  const tiles: {
    key: string;
    label: string;
    value: number;
    href?: string;
    emphasis: boolean;
  }[] = [
    { key: "short", label: "不足", value: tally.short, href: hrefs?.short, emphasis: true },
    { key: "near", label: "目安圏内", value: tally.near, href: hrefs?.near, emphasis: false },
    { key: "achieved", label: "達成", value: tally.achieved, href: hrefs?.achieved, emphasis: false },
    { key: "attention", label: "上限注意", value: tally.attention, href: hrefs?.attention, emphasis: true },
  ];

  return (
    <div style={styles.grid} role="group" aria-label="今日の状態サマリー">
      {tiles.map((tile) => {
        const tileStyle = {
          ...styles.tile,
          ...(tile.emphasis ? styles.tileEmphasis : styles.tileQuiet),
        };
        const content = (
          <>
            <span style={styles.value}>{tile.value}</span>
            <span style={styles.label}>{tile.label}</span>
          </>
        );
        // Link only when the target section exists (count > 0).
        if (tile.href && tile.value > 0) {
          return (
            <a
              key={tile.key}
              href={tile.href}
              style={{ ...tileStyle, ...styles.tileLink }}
              aria-label={`${tile.label} ${tile.value}件へ移動`}
            >
              {content}
            </a>
          );
        }
        return (
          <div key={tile.key} style={tileStyle}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    margin: "16px 0 4px",
  },
  tile: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    minHeight: "var(--tap-target-min)",
    padding: "10px 4px",
    borderRadius: "var(--radius-md)",
    background: "var(--color-base)",
  },
  tileEmphasis: { border: "1px solid var(--color-text)" },
  tileQuiet: { border: "1px solid var(--color-surface)" },
  tileLink: {
    textDecoration: "none",
    color: "inherit",
    cursor: "pointer",
  },
  value: {
    fontFamily: "var(--font-numeric)",
    fontSize: "22px",
    lineHeight: 1.1,
    color: "var(--color-primary-deep)",
  },
  label: { fontSize: "11px", color: "var(--color-subtext)" },
} satisfies Record<string, React.CSSProperties>;
