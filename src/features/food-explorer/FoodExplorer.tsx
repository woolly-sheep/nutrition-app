"use client";

import { useEffect, useState } from "react";
import type {
  FoodNutrientsResponse,
  FoodSearchItem,
} from "../../server/api/schemas/foods";
import { FoodNutrientView } from "./FoodNutrientView";

/**
 * 食材を調べる: search the catalog and open one food's nutrient profile
 * (食材の栄養価ビュー). A read-only exploration surface — it never records
 * anything. The friendly sky accent marks it as an "explore" entry, distinct
 * from the status colours used for 不足/達成/上限.
 */
export function FoodExplorer() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly FoodSearchItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodSearchItem | null>(null);
  const [detail, setDetail] = useState<FoodNutrientsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (selected !== null) {
      return;
    }
    if (query.trim() === "") {
      setResults([]);
      setMessage(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/foods?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          foods: FoodSearchItem[];
          message?: string;
        };
        setResults(data.foods);
        setMessage(data.message ?? null);
      } catch {
        // aborted or offline — keep the previous results
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, selected]);

  const select = async (item: FoodSearchItem) => {
    setSelected(item);
    setDetail(null);
    setFailed(false);
    setLoading(true);
    try {
      const response = await fetch(
        `/api/foods/${encodeURIComponent(item.food_id)}/nutrients`,
      );
      if (!response.ok) {
        setFailed(true);
        return;
      }
      setDetail((await response.json()) as FoodNutrientsResponse);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelected(null);
    setDetail(null);
    setFailed(false);
  };

  if (selected !== null) {
    if (detail !== null) {
      return (
        <FoodNutrientView
          data={detail}
          unitOptions={selected.unit_options}
          onReset={reset}
        />
      );
    }
    return (
      <div>
        <button type="button" className="pressable" onClick={reset} style={styles.reset}>
          ← 別の食材を調べる
        </button>
        <p style={styles.status}>
          {failed ? "読み込めませんでした。もう一度お試しください。" : "読み込み中…"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="食品名で検索 — 栄養価を見る"
        aria-label="調べる食品名"
        style={styles.search}
      />
      {message !== null && <p style={styles.status}>{message}</p>}
      {results.length > 0 && (
        <ul style={styles.list}>
          {results.map((item) => (
            <li key={item.food_id}>
              <button
                type="button"
                className="pressable"
                onClick={() => void select(item)}
                style={styles.resultRow}
              >
                <span style={styles.resultName}>{item.display_name}</span>
                <span style={styles.resultKcal}>
                  {item.energy_kcal_per_100g === null
                    ? ""
                    : `${item.energy_kcal_per_100g} kcal/100g`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  search: {
    width: "100%",
    minHeight: "var(--tap-target-min)",
    padding: "0 var(--space-3)",
    border: "1px solid var(--color-sky-line, rgba(93,180,204,.5))",
    borderRadius: "var(--radius-md)",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "16px",
    boxSizing: "border-box" as const,
  },
  status: { color: "var(--color-subtext)", fontSize: "13px", margin: "var(--space-3) 0 0" },
  list: { listStyle: "none", margin: "var(--space-2) 0 0", padding: 0 },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "var(--space-3)",
    width: "100%",
    minHeight: "var(--tap-target-min)",
    padding: "var(--space-2) var(--space-3)",
    border: "1px solid var(--color-surface)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-base)",
    marginBottom: "6px",
    cursor: "pointer",
    textAlign: "left" as const,
    font: "inherit",
    color: "var(--color-text)",
  },
  resultName: { fontSize: "14px" },
  resultKcal: { fontSize: "12px", color: "var(--color-subtext)", flex: "none" },
  reset: {
    minHeight: "var(--tap-target-min)",
    padding: "0 var(--space-3)",
    border: "none",
    background: "transparent",
    color: "var(--color-sky-ink)",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
} satisfies Record<string, React.CSSProperties>;
