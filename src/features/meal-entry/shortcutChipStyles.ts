/**
 * Shared styling for the 記録タブ shortcut rails (#62). いつもの and
 * 不足を補う候補 both render as a single horizontal-scroll row of tap-to-add
 * chips so a handful of shortcuts stay reachable without stretching the tab
 * vertically. Colors stay within the calm palette — no warning red, gold is
 * reserved for badges elsewhere.
 */
export const chipStyles = {
  sectionTitle: { fontSize: "15px", margin: "0 0 8px" },
  sectionHint: {
    fontSize: "12px",
    fontWeight: 400,
    color: "var(--color-subtext)",
  },
  rail: {
    listStyle: "none",
    margin: 0,
    padding: "2px 0 4px",
    display: "flex",
    gap: "8px",
    overflowX: "auto" as const,
    WebkitOverflowScrolling: "touch" as const,
    scrollbarWidth: "thin" as const,
  },
  railItem: { flex: "0 0 auto", listStyle: "none" },
  chip: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    gap: "2px",
    minHeight: "var(--tap-target-min)",
    maxWidth: "180px",
    overflow: "hidden",
    padding: "8px 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "var(--radius-pill)",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    cursor: "pointer",
    textAlign: "left" as const,
  },
  chipName: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    maxWidth: "100%",
    fontSize: "14px",
    fontWeight: 700,
  },
  chipLabel: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  chipPlus: { flex: "0 0 auto", fontSize: "13px", lineHeight: 1 },
  chipMeta: {
    maxWidth: "100%",
    fontSize: "12px",
    fontWeight: 400,
    color: "var(--color-subtext)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chipTag: {
    flex: "0 0 auto",
    display: "inline-flex",
    alignItems: "center",
    padding: "0 6px",
    height: "18px",
    borderRadius: "var(--radius-pill)",
    background: "var(--color-surface)",
    color: "var(--color-text)",
    fontSize: "11px",
    fontWeight: 700,
  },
} satisfies Record<string, React.CSSProperties>;
