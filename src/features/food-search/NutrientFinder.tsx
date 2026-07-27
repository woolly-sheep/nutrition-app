"use client";

import { useState } from "react";
import {
  SELECTABLE_NUTRIENTS,
  type RichFoodItem,
} from "../../domain/nutrient/topFoodsByNutrient";
import type { RichFoodsResponse } from "../../server/api/handlers/richFoods";
import type { DraftItem } from "./FoodSearchBox";

/**
 * 栄養素から探す — pick a nutrient, see the foods richest in it (per 100g),
 * add a 100g starting portion to the draft. Fact-only reference over the
 * frozen seed; the notice makes clear it is not a recommendation.
 */
type Props = {
  onAdd: (item: DraftItem) => void;
};

type Scope = "all" | "history";

export function NutrientFinder({ onAdd }: Props) {
  const [code, setCode] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [foods, setFoods] = useState<readonly RichFoodItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = async (nextCode: string, nextScope: Scope) => {
    if (nextCode === "") {
      setFoods([]);
      setNotice(null);
      setSearched(false);
      return;
    }
    try {
      const response = await fetch(
        `/api/foods/rich?nutrient=${encodeURIComponent(nextCode)}&scope=${nextScope}`,
      );
      if (response.ok) {
        const data = (await response.json()) as RichFoodsResponse;
        setFoods(data.foods);
        setNotice(data.notice);
        setSearched(true);
      }
    } catch {
      // finder is supplementary — the main search still works
    }
  };

  const handleSelect = (nextCode: string) => {
    setCode(nextCode);
    void runSearch(nextCode, scope);
  };

  const handleScope = (nextScope: Scope) => {
    setScope(nextScope);
    void runSearch(code, nextScope);
  };

  return (
    <div>
      <label htmlFor="nutrient-finder" style={styles.label}>
        栄養素から探す
      </label>
      <select
        id="nutrient-finder"
        value={code}
        onChange={(event) => handleSelect(event.target.value)}
        style={styles.select}
      >
        <option value="">栄養素を選ぶ…</option>
        {SELECTABLE_NUTRIENTS.map((nutrient) => (
          <option key={nutrient.code} value={nutrient.code}>
            {nutrient.label}
          </option>
        ))}
      </select>

      <div role="group" aria-label="対象" style={styles.scopeRow}>
        {(
          [
            ["all", "全食品"],
            ["history", "食べた食材から"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => handleScope(value)}
            aria-pressed={scope === value}
            style={{
              ...styles.scopeButton,
              background:
                scope === value ? "var(--color-primary)" : "var(--color-base)",
              color:
                scope === value ? "var(--color-base)" : "var(--color-subtext)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {searched && foods.length === 0 && scope === "history" && (
        <p style={styles.notice}>
          この栄養素を含む食材は、過去1年の記録にありません。「全食品」で探すか、
          記録を増やすと表示されます。
        </p>
      )}

      {foods.length > 0 && (
        <ul style={styles.list}>
          {foods.map((food) => (
            <li key={food.food_id} style={styles.row}>
              <span style={{ flex: 1 }}>
                {food.display_name}
                <span style={styles.amount}>
                  {" "}
                  {food.amount_per_100g}
                  {food.unit}/100g
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  onAdd({
                    foodId: food.food_id,
                    displayName: food.display_name,
                    intakeG: 100,
                    estimatedKcal: null,
                  })
                }
                aria-label={`${food.display_name}を100gで追加`}
                style={styles.add}
              >
                ＋100g
              </button>
            </li>
          ))}
        </ul>
      )}
      {notice && <p style={styles.notice}>{notice}</p>}
    </div>
  );
}

const styles = {
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "6px",
  },
  select: {
    width: "100%",
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-subtext)",
    borderRadius: "var(--radius-sm)",
    fontSize: "16px",
    background: "var(--color-base)",
    color: "var(--color-text)",
  },
  scopeRow: { display: "flex", gap: "8px", marginTop: "8px" },
  scopeButton: {
    minHeight: "var(--tap-target-min)",
    flex: 1,
    border: "1px solid var(--color-primary)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  list: { listStyle: "none", margin: "8px 0 0", padding: 0 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "var(--tap-target-min)",
    padding: "4px 0",
    borderBottom: "1px solid var(--color-surface)",
    fontSize: "14px",
  },
  amount: { color: "var(--color-subtext)", fontSize: "12px" },
  add: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  notice: { color: "var(--color-subtext)", fontSize: "11px", margin: "8px 0 0" },
} satisfies Record<string, React.CSSProperties>;
