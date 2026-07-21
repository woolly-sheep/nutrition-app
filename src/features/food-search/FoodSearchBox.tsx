"use client";

import { useEffect, useState } from "react";
import { estimateIntakeAmount } from "../../domain/nutrient/estimateIntakeAmount";
import type { FoodSearchItem } from "../../server/api/schemas/foods";

/**
 * Search inside the 記録 tab (UI design v0.1 §4.2). Not a standalone
 * screen. Amounts save in grams. Foods with a per-unit weight (seed or the
 * standard weight reference) can be entered by count (個/枚/本 …); the count
 * is multiplied by the estimated unit weight to grams. Direct grams input is
 * always available. Reference weights are shown as 推定 (see
 * docs/decisions/decision-20260721-standard-weight-reference.md).
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
  const [countText, setCountText] = useState("");

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

  // Units with a usable per-unit weight enable count input (seed or 推定).
  const countableUnit =
    selected?.unit_options.find(
      (option) => option.representative_weight_g !== null,
    ) ?? null;
  const count = Number(countText);
  const countValid = Number.isFinite(count) && count > 0;
  const countGrams =
    countableUnit && countValid
      ? Math.round(count * (countableUnit.representative_weight_g as number))
      : null;

  const addGrams = (food: FoodSearchItem, intakeG: number) => {
    onAdd({
      foodId: food.food_id,
      displayName: food.display_name,
      intakeG,
      estimatedKcal:
        food.energy_kcal_per_100g === null
          ? null
          : estimateIntakeAmount(intakeG, food.energy_kcal_per_100g),
    });
    setSelected(null);
    setGramsText("");
    setCountText("");
    setQuery("");
  };

  const handleAddGrams = () => {
    if (!selected || !gramsValid) {
      return;
    }
    addGrams(selected, grams);
  };

  const handleAddCount = () => {
    if (!selected || countGrams === null) {
      return;
    }
    addGrams(selected, countGrams);
  };

  const unitLabel = (displayUnit: string) => displayUnit.replace(/^1/, "");

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
                onClick={() => {
                  setSelected(food);
                  setGramsText("");
                  setCountText("");
                }}
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

          {countableUnit !== null && (
            <div style={styles.inputBlock}>
              <p style={styles.inputLabel}>
                個数で入力（{unitLabel(countableUnit.display_unit)}）
              </p>
              <div style={styles.gramsRow}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={countText}
                  onChange={(event) => setCountText(event.target.value)}
                  placeholder="0"
                  aria-label={`個数（${unitLabel(countableUnit.display_unit)}）`}
                  style={styles.gramsInput}
                />
                <span>{unitLabel(countableUnit.display_unit)}</span>
                <button
                  type="button"
                  onClick={handleAddCount}
                  disabled={countGrams === null}
                  style={{
                    ...styles.addButton,
                    opacity: countGrams === null ? 0.5 : 1,
                  }}
                >
                  ＋追加
                </button>
              </div>
              <p style={styles.subtext}>
                {countableUnit.display_unit} ≈{" "}
                {countableUnit.representative_weight_g}g（
                {countableUnit.source === "reference_estimate"
                  ? "一般的な目安・推定"
                  : "推定"}
                ）
                {countGrams !== null && ` → 約 ${countGrams}g`}
              </p>
              {countableUnit.source === "reference_estimate" &&
                countableUnit.source_note !== null && (
                  <p style={styles.subtext}>出典: {countableUnit.source_note}</p>
                )}
            </div>
          )}

          <div style={styles.inputBlock}>
            <p style={styles.inputLabel}>gで入力</p>
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
                onClick={handleAddGrams}
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
  inputBlock: {
    marginTop: "12px",
  },
  inputLabel: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--color-text)",
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
