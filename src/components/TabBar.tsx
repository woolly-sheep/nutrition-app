"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 3-tab IA (UI design v0.1 §3.1). Search lives inside 記録, not as a tab. */
const TABS = [
  { href: "/", label: "ホーム", icon: "●" },
  { href: "/meals", label: "記録", icon: "＋" },
  { href: "/analysis", label: "分析", icon: "◧" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav aria-label="主要タブ" style={styles.bar}>
      {TABS.map((tab) => {
        const isActive =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            style={{
              ...styles.tab,
              color: isActive ? "var(--color-primary)" : "var(--color-subtext)",
              fontWeight: isActive ? 700 : 400,
            }}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const styles = {
  bar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    background: "var(--color-base)",
    borderTop: "1px solid var(--color-surface)",
  },
  tab: {
    flex: 1,
    minHeight: "var(--tap-target-min)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    padding: "6px 0",
    textDecoration: "none",
    fontSize: "12px",
  },
} satisfies Record<string, React.CSSProperties>;
