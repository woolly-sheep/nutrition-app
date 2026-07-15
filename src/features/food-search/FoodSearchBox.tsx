"use client";

import { useEffect, useState } from "react";
import { estimateIntakeAmount } from "../../domain/nutrient/estimateIntakeAmount";
import type { FoodSearchItem } from "../../server/api/schemas/foods";

/**
 * Search inside the 記録 tab (UI design v0.1 §4.2). Not a standalone
 * screen. Amounts are entered in grams only — unit conversions are shown
 * as reference text, never auto-applied (explicit grams first).
 */

export type DraftItem = {
  foodId: string;
  displayName: string;
  intakeG: number;
  /** null when the official energy value is non-numeric. */
  estimatedKcal: number | null;
};

type Props = {
  onAdd: (item: DraftItem) => void;
};

export function FoodSearchBox({ onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly FoodSearchItem[]>([]);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodSearchItem | null>(null);
  const [gramsText, setGramsText] = useState("");

  useEffect(() => {
    if (query.trim() === "") {
      setResults([]);
      setEmptyMessage(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/foods?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as {
          foods: FoodSearchItem[];
          message?: string;
        };
        setResults(data.foods);
        setEmptyMessage(data.message ?? null);
      } catch {
        // aborted or offline — keep previous results
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const grams = Number(gramsText);
  const gramsValid = Number.isFinite(grams) && grams > 0;

  const handleAdd = () => {
    if (!selected || !gramsValid) {
      return;
    }
    onAdd({
      foodId: selected.food_id,
      displayName: selected.display_name,
      intakeG: grams,
      estimatedKcal:
        selected.energy_kcal_per_100g === null
          ? null
          : estimateIntakeAmount(grams, selected.energy_kcal_per_100g),
    });
    setSelected(null);
    setGramsText("");
    setQuery("");
  };

  return (
    <section>
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(null);
        }}
        placeholder="食品名で検索 — ここから探して追加"
        aria-label="食品名で検索"
        style={styles.searchInput}
      />

      {emptyMessage !== null && <p style={styles.subtext}>{emptyMessage}</p>}

      {results.length > 0 && selected === null && (
        <ul style={styles.resultList}>
          {results.map((food) => (
            <li key={food.food_id}>
              <button
                type="button"
                onClick={() => setSelected(food)}
                style={styles.resultRow}
              >
                <span>{food.display_name}</span>
                <span style={styles.subtext}>
                  {food.energy_kcal_per_100g !== null &&
                    `${food.energy_kcal_per_100g} kcal / 100g`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected !== null && (
        <div style={styles.gramsPanel}>
          <p style={{ margin: 0, fontWeight: 700 }}>{selected.display_name}</p>
          {selected.unit_options
            .filter((option) => option.representative_weight_g !== null)
            .map((option) => (
              <p key={option.display_unit} style={styles.subtext}>
                参考: {option.display_unit} ≈ {option.representative_weight_g}g
                （表示のみ・入力はgで行います）
              </p>
            ))}
          <div style={styles.gramsRow}>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              value={gramsText}
              onChange={(event) => setGramsText(event.target.value)}
              placeholder="g"
              aria-label="摂取量（グラム）"
              style={styles.gramsInput}
            />
            <span>g</span>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!gramsValid}
              style={{
                ...styles.addButton,
                opacity: gramsValid ? 1 : 0.5,
              }}
            >
              ＋追加
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const styles = {
  searchInput: {
    width: "100%",
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-subtext)",
    borderRadius: "8px",
    fontSize: "16px",
    background: "var(--color-base)",
    color: "var(--color-text)",
  },
  resultList: {
    listStyle: "none",
    margin: "8px 0 0",
    padding: 0,
    border: "1px solid var(--color-surface)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  resultRow: {
    width: "100%",
    minHeight: "var(--tap-target-min)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    border: "none",
    borderBottom: "1px solid var(--color-surface)",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "15px",
    textAlign: "left",
    cursor: "pointer",
  },
  gramsPanel: {
    marginTop: "8px",
    padding: "12px",
    borderRadius: "8px",
    background: "var(--color-surface)",
  },
  gramsRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "8px",
  },
  gramsInput: {
    width: "100px",
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-subtext)",
    borderRadius: "8px",
    fontSize: "16px",
  },
  addButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 16px",
    border: "none",
    borderRadius: "8px",
    background: "var(--color-primary)",
    color: "var(--color-base)",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  subtext: {
    color: "var(--color-subtext)",
    fontSize: "13px",
    margin: "4px 0 0",
  },
} satisfies Record<string, React.CSSProperties>;
