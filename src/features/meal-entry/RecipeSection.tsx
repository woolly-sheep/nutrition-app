"use client";

import { useState } from "react";
import type { RecipeView } from "../../server/api/handlers/listRecipes";
import { FoodSearchBox, type DraftItem } from "../food-search/FoodSearchBox";

/**
 * 料理から追加 (decision-20260725-recipe-presets). Lists saved recipes; each can
 * be logged into the current draft, scaled by 何人前 (servings), edited inline
 * (rename / adjust grams / add / remove ingredients), or deleted. Recipes store
 * no nutrient values — grams are the source of truth and nutrition is recomputed
 * from the seed, so a servings multiplier is just a grams multiplier.
 */

type Props = {
  recipes: readonly RecipeView[];
  /** Append the (already servings-scaled) items to the meal draft. */
  onAddToDraft: (items: DraftItem[]) => void;
  /** Reload recipes after an edit or delete. */
  onChanged: () => void;
};

export function RecipeSection({ recipes, onAddToDraft, onChanged }: Props) {
  if (recipes.length === 0) {
    return null;
  }
  return (
    <section style={{ marginTop: "24px" }}>
      <h2 style={styles.sectionTitle}>
        料理から追加
        <span style={styles.sectionHint}>（登録した料理をまとめて追加）</span>
      </h2>
      <ul style={styles.list}>
        {recipes.map((recipe) => (
          <RecipeRow
            key={recipe.recipe_id}
            recipe={recipe}
            onAddToDraft={onAddToDraft}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </section>
  );
}

type EditItem = { foodId: string; displayName: string; gramsText: string };

function RecipeRow({
  recipe,
  onAddToDraft,
  onChanged,
}: {
  recipe: RecipeView;
  onAddToDraft: (items: DraftItem[]) => void;
  onChanged: () => void;
}) {
  const [servings, setServings] = useState(1);
  const [editing, setEditing] = useState(false);

  const handleAdd = () => {
    const factor = servings > 0 ? servings : 1;
    onAddToDraft(
      recipe.items.map((item) => ({
        foodId: item.food_id,
        displayName: item.display_name,
        intakeG: Math.round(item.intake_g * factor * 10) / 10,
        estimatedKcal:
          item.estimated_kcal === null
            ? null
            : Math.round(item.estimated_kcal * factor),
      })),
    );
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipe.recipe_id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onChanged();
      }
    } catch {
      // list stays as-is; the user can retry
    }
  };

  if (editing) {
    return (
      <li style={styles.editItem}>
        <RecipeEditor
          recipe={recipe}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      </li>
    );
  }

  return (
    <li style={styles.row}>
      <span style={{ flex: 1, minWidth: 0 }}>
        {recipe.name}
        <span style={styles.meta}>
          {" "}
          {recipe.items.length}品
          {recipe.estimated_kcal !== null &&
            ` · 約 ${Math.round(recipe.estimated_kcal * (servings > 0 ? servings : 1))} kcal`}
        </span>
      </span>
      <label style={styles.servingsLabel}>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          value={servings}
          onChange={(event) => setServings(Number(event.target.value))}
          aria-label={`${recipe.name}の人前`}
          style={styles.servingsInput}
        />
        人前
      </label>
      <button
        type="button"
        onClick={handleAdd}
        aria-label={`${recipe.name}を${servings}人前で追加`}
        style={styles.add}
      >
        ＋追加
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`${recipe.name}を編集`}
        style={styles.secondary}
      >
        編集
      </button>
      <button
        type="button"
        onClick={() => void handleDelete()}
        aria-label={`${recipe.name}を削除`}
        style={styles.secondary}
      >
        削除
      </button>
    </li>
  );
}

function RecipeEditor({
  recipe,
  onCancel,
  onSaved,
}: {
  recipe: RecipeView;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(recipe.name);
  const [items, setItems] = useState<EditItem[]>(
    recipe.items.map((item) => ({
      foodId: item.food_id,
      displayName: item.display_name,
      gramsText: String(item.intake_g),
    })),
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle",
  );

  const canSave =
    name.trim() !== "" &&
    items.length > 0 &&
    items.every((item) => {
      const g = Number(item.gramsText);
      return Number.isFinite(g) && g > 0;
    }) &&
    saveState !== "saving";

  const handleAddItem = (item: DraftItem) => {
    setItems((current) => [
      ...current,
      {
        foodId: item.foodId,
        displayName: item.displayName,
        gramsText: String(item.intakeG),
      },
    ]);
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaveState("saving");
    try {
      const response = await fetch(`/api/recipes/${recipe.recipe_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          items: items.map((item) => ({
            food_id: item.foodId,
            intake_g: Number(item.gramsText),
          })),
        }),
      });
      if (!response.ok) {
        setSaveState("error");
        return;
      }
      onSaved();
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div style={styles.editCard}>
      <p style={styles.editHeading}>料理を編集</p>

      <label style={styles.label} htmlFor={`recipe-name-${recipe.recipe_id}`}>
        料理名
      </label>
      <input
        id={`recipe-name-${recipe.recipe_id}`}
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={100}
        style={styles.textInput}
      />

      <span style={styles.label}>食材（グラム）</span>
      <ul style={styles.editList}>
        {items.map((item, index) => (
          <li key={`${item.foodId}-${index}`} style={styles.editRow}>
            <span style={{ flex: 1, minWidth: 0, fontSize: "14px" }}>
              {item.displayName}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              value={item.gramsText}
              onChange={(event) =>
                setItems((current) =>
                  current.map((it, i) =>
                    i === index ? { ...it, gramsText: event.target.value } : it,
                  ),
                )
              }
              aria-label={`${item.displayName}のグラム`}
              style={styles.gramsInput}
            />
            <span style={styles.gramsUnit}>g</span>
            <button
              type="button"
              onClick={() =>
                setItems((current) => current.filter((_, i) => i !== index))
              }
              aria-label={`${item.displayName}を外す`}
              style={styles.removeRow}
            >
              取消
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p style={styles.note}>
          食材が0件になると保存できません。削除を使ってください。
        </p>
      )}

      <div style={styles.addBox}>
        <p style={styles.addLabel}>食材を追加</p>
        <FoodSearchBox onAdd={handleAddItem} />
      </div>

      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.cancel}>
          やめる
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          style={{ ...styles.save, opacity: canSave ? 1 : 0.5 }}
        >
          保存
        </button>
      </div>
      {saveState === "error" && (
        <p role="status" style={styles.note}>
          保存できませんでした。もう一度お試しください。
        </p>
      )}
    </div>
  );
}

const styles = {
  sectionTitle: { fontSize: "15px", margin: "0 0 8px" },
  sectionHint: {
    fontSize: "12px",
    fontWeight: 400,
    color: "var(--color-subtext)",
  },
  list: { listStyle: "none", margin: 0, padding: 0 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "var(--tap-target-min)",
    padding: "6px 0",
    borderBottom: "1px solid var(--color-surface)",
    fontSize: "14px",
    flexWrap: "wrap",
  },
  meta: { color: "var(--color-subtext)", fontSize: "12px" },
  servingsLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    color: "var(--color-subtext)",
  },
  servingsInput: {
    width: "48px",
    minHeight: "var(--tap-target-min)",
    padding: "0 6px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "16px",
    textAlign: "center",
  },
  add: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondary: {
    minHeight: "var(--tap-target-min)",
    padding: "0 10px",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "var(--color-subtext)",
    fontSize: "13px",
    cursor: "pointer",
  },
  editItem: { listStyle: "none", padding: 0, marginBottom: "8px" },
  editCard: {
    border: "1px solid var(--color-primary)",
    borderRadius: "10px",
    padding: "14px",
    marginTop: "8px",
  },
  editHeading: { fontSize: "14px", fontWeight: 700, margin: "0 0 8px" },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    margin: "12px 0 6px",
  },
  textInput: {
    width: "100%",
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  editList: { listStyle: "none", margin: 0, padding: 0 },
  editRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "var(--tap-target-min)",
    padding: "2px 0",
  },
  gramsInput: {
    width: "72px",
    minHeight: "var(--tap-target-min)",
    padding: "0 8px",
    border: "1px solid var(--color-subtext)",
    borderRadius: "8px",
    fontSize: "16px",
  },
  gramsUnit: { color: "var(--color-subtext)", fontSize: "13px" },
  removeRow: {
    minHeight: "var(--tap-target-min)",
    padding: "0 8px",
    border: "none",
    background: "transparent",
    color: "var(--color-subtext)",
    fontSize: "13px",
    cursor: "pointer",
  },
  addBox: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid var(--color-surface)",
  },
  addLabel: { fontSize: "13px", fontWeight: 700, margin: "0 0 6px" },
  actions: { display: "flex", gap: "10px", marginTop: "14px" },
  cancel: {
    minHeight: "var(--tap-target-min)",
    padding: "0 16px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  save: {
    flex: "1 1 auto",
    minHeight: "var(--tap-target-min)",
    border: "none",
    borderRadius: "8px",
    background: "var(--color-primary)",
    color: "var(--color-base)",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  note: {
    color: "var(--color-subtext)",
    fontSize: "12px",
    margin: "8px 0 0",
    lineHeight: 1.6,
  },
} satisfies Record<string, React.CSSProperties>;
