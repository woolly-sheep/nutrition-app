"use client";

import { useEffect, useState } from "react";
import type {
  GardenDayCell,
  GardenResponse,
} from "../server/api/handlers/getGarden";

/**
 * 月間の庭 — the last 5 weeks as a grid of daily blooms. Bloom size grows with
 * the day's mean fulfilment; a fully-achieved day is gold. Days with no
 * records are faint buds (never zero-filled), so gaps read as "not yet",
 * not failure. Read-only retrospective; no medical wording.
 */
type Props = {
  date: string;
};

export function MonthGarden({ date }: Props) {
  const [days, setDays] = useState<readonly GardenDayCell[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/analysis/garden?date=${date}`);
        if (response.ok && active) {
          const data = (await response.json()) as GardenResponse;
          setDays(data.days);
        }
      } catch {
        // supplementary — the rest of the analysis screen still renders
      }
    })();
    return () => {
      active = false;
    };
  }, [date]);

  if (!days || days.length === 0) {
    return null;
  }

  return (
    <section style={{ marginTop: "24px" }}>
      <h2 style={styles.title}>月間の庭</h2>
      <div style={styles.grid}>
        {days.map((day) => (
          <div key={day.date} title={label(day)} style={styles.cell}>
            <MiniBloom fulfillment={day.fulfillment} />
          </div>
        ))}
      </div>
      <p style={styles.caption}>
        1日1輪・直近5週間。花が大きい日ほど基準に近い推定（記録なしはつぼみ）。
      </p>
    </section>
  );
}

function label(day: GardenDayCell): string {
  const d = `${Number(day.date.slice(5, 7))}/${Number(day.date.slice(8, 10))}`;
  return day.fulfillment === null
    ? `${d} 記録なし`
    : `${d} 約${Math.round(day.fulfillment * 100)}%充足`;
}

function MiniBloom({ fulfillment }: { fulfillment: number | null }) {
  if (fulfillment === null) {
    return (
      <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="15" cy="15" r="3.5" fill="var(--color-surface)" />
      </svg>
    );
  }
  const capped = Math.min(fulfillment, 1);
  const ry = 4 + capped * 3.5;
  const achieved = fulfillment >= 1;
  const fill = achieved ? "var(--color-accent)" : "var(--color-primary)";
  const centerFill = achieved ? "#fdf0cf" : "var(--color-surface)";
  return (
    <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="15"
          cy={15 - (4 + ry)}
          rx="3.1"
          ry={ry}
          fill={fill}
          transform={`rotate(${angle} 15 15)`}
        />
      ))}
      <circle cx="15" cy="15" r="3" fill={centerFill} />
    </svg>
  );
}

const styles = {
  title: { fontSize: "15px", margin: "0 0 12px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    justifyItems: "center",
  },
  cell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    aspectRatio: "1 / 1",
  },
  caption: {
    color: "var(--color-subtext)",
    fontSize: "11px",
    margin: "10px 0 0",
  },
} satisfies Record<string, React.CSSProperties>;
