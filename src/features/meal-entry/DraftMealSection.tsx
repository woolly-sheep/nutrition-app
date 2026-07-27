"use client";

import { useState } from "react";
import type { DraftItem } from "../food-search/FoodSearchBox";

/**
 * この食事に追加済み section: the 5a "add preview" list (dashed border,
 * unsaved) plus the「料理として登録」box. Owns the recipe-name draft and
 * the POST; nutrition is never persisted (recomputed from the seed), so it
 * only sends food_id + grams. Calls onRecipeSaved so the parent can refresh.
 */
export function DraftMealSection({
  draftItems,
  onRemove,
  onRecipeSaved,
}: {
  draftItems: readonly DraftItem[];
  onRemove: (index: number) => void;
  onRecipeSaved: () => void;
}) {
  const [recipeName, setRecipeName] = useState("");
  const [savingRecipe, setSavingRecipe] = useState(false);

  const canSaveRecipe =
    draftItems.length > 0 && recipeName.trim() !== "" && !savingRecipe;

  const handleSaveRecipe = async () => {
    if (!canSaveRecipe) {
      return;
    }
    setSavingRecipe(true);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recipeName.trim(),
          items: draftItems.map((item) => ({
            food_id: item.foodId,
            intake_g: item.intakeG,
          })),
        }),
      });
      if (response.ok) {
        setRecipeName("");
        onRecipeSaved();
      }
    } catch {
      // keep the draft as-is so the user can retry
    } finally {
      setSavingRecipe(false);
    }
  };

  return (
    <section style={{ marginTop: "24px" }}>
      <h2 style={styles.sectionTitle}>この食事に追加済み</h2>
      {draftItems.length === 0 ? (
        <p style={styles.subtext}>
          検索から食品を追加すると、ここに保存前の内容が表示されます。
        </p>
      ) : (
        <ul style={styles.draftList}>
          {draftItems.map((item, index) => (
            <li key={`${item.foodId}-${index}`} style={styles.draftRow}>
              <span>
                {item.displayName} {item.intakeG}g
              </span>
              <span style={styles.subtext}>
                {item.estimatedKcal !== null &&
                  `約 ${Math.round(item.estimatedKcal)} kcal`}
              </span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`${item.displayName}を取り消す`}
                style={styles.removeButton}
              >
                取消
              </button>
            </li>
          ))}
        </ul>
      )}
      {draftItems.length > 0 && (
        <div style={styles.recipeSaveBox}>
          <p style={styles.subtext}>
            この内容を料理として登録すると、次回から名前でまとめて追加できます。
          </p>
          <div style={styles.recipeSaveRow}>
            <input
              type="text"
              value={recipeName}
              onChange={(event) => setRecipeName(event.target.value)}
              placeholder="料理名（例: いつもの朝食）"
              maxLength={100}
              aria-label="料理名"
              style={styles.recipeNameInput}
            />
            <button
              type="button"
              onClick={() => void handleSaveRecipe()}
              disabled={!canSaveRecipe}
              style={{
                ...styles.shortcutAdd,
                opacity: canSaveRecipe ? 1 : 0.5,
              }}
            >
              料理として登録
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const styles = {
  sectionTitle: { fontSize: "15px", margin: "0 0 8px" },
  subtext: { color: "var(--color-subtext)", fontSize: "13px", margin: 0 },
  draftList: { listStyle: "none", margin: 0, padding: 0 },
  draftRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    justifyContent: "space-between",
    minHeight: "var(--tap-target-min)",
    padding: "8px 12px",
    marginBottom: "8px",
    // 5a add-preview coding: unsaved = dashed & translucent
    border: "1px dashed var(--color-primary)",
    borderRadius: "var(--radius-sm)",
    background: "rgba(47, 140, 126, 0.08)",
  },
  removeButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--color-subtext)",
    cursor: "pointer",
  },
  recipeSaveBox: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid var(--color-surface)",
  },
  recipeSaveRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginTop: "8px",
  },
  recipeNameInput: {
    flex: 1,
    minWidth: 0,
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "16px",
    boxSizing: "border-box" as const,
  },
  shortcutAdd: {
    minHeight: "var(--tap-target-min)",
    minWidth: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
} satisfies Record<string, React.CSSProperties>;
