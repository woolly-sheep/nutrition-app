"use client";

import { useState } from "react";
import type { DayMeal } from "../../server/api/handlers/listDayMeals";
import type { MealType } from "../../server/api/schemas/meals";
import { FoodSearchBox, type DraftItem } from "../food-search/FoodSearchBox";

/**
 * この日の記録: the day's saved meals with inline edit (grams / item removal /
 * item add) and a two-step delete (UI design v0.5/v0.7). Self-contained — owns
 * its own edit/delete state; the parent only supplies the meals and a reload
 * callback. Never log meal contents.
 */

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

type EditItem = { foodId: string; displayName: string; gramsText: string };

type Props = {
  meals: readonly DayMeal[];
  /** Reload the day's meals after an edit or delete. */
  onChanged: () => void;
};

export function SavedMealsList({ meals, onChanged }: Props) {
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<readonly EditItem[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const startEditing = (meal: DayMeal) => {
    setEditingMealId(meal.meal_id);
    setConfirmingDelete(null);
    setEditItems(
      meal.items.map((item) => ({
        foodId: item.food_id,
        displayName: item.display_name,
        gramsText: String(item.intake_g),
      })),
    );
  };

  const handleAddToEdit = (item: DraftItem) => {
    setEditItems((current) => [
      ...current,
      {
        foodId: item.foodId,
        displayName: item.displayName,
        gramsText: String(item.intakeG),
      },
    ]);
  };

  const canSaveEdit =
    editItems.length > 0 &&
    editItems.every((item) => {
      const grams = Number(item.gramsText);
      return Number.isFinite(grams) && grams > 0;
    });

  const handleEditSave = async (mealId: string) => {
    if (!canSaveEdit) {
      return;
    }
    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editItems.map((item) => ({
            food_id: item.foodId,
            intake_g: Number(item.gramsText),
          })),
        }),
      });
      if (response.ok) {
        setEditingMealId(null);
        onChanged();
      }
    } catch {
      // card stays in edit mode; the user can retry or cancel
    }
  };

  const handleDelete = async (mealId: string) => {
    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setConfirmingDelete(null);
        onChanged();
      }
    } catch {
      // list stays as-is; the user can retry
    }
  };

  return (
    <section style={{ marginTop: "28px" }}>
      <h2 style={styles.sectionTitle}>この日の記録</h2>
      {meals.length === 0 ? (
        <p style={styles.subtext}>この日の記録はまだありません。</p>
      ) : (
        <ul style={styles.list}>
          {meals.map((meal) => (
            <li key={meal.meal_id} style={styles.savedCard}>
              <div style={styles.savedHead}>
                <span style={{ fontWeight: 700, fontSize: "13px" }}>
                  {MEAL_TYPE_LABELS[meal.meal_type]}
                </span>
                {meal.estimated_kcal !== null && (
                  <span style={styles.subtext}>
                    約 {Math.round(meal.estimated_kcal)} kcal
                  </span>
                )}
              </div>
              {editingMealId === meal.meal_id ? (
                <div>
                  <ul style={styles.list}>
                    {editItems.map((item, index) => (
                      <li key={`${item.foodId}-${index}`} style={styles.editRow}>
                        <span style={{ flex: 1, fontSize: "14px" }}>
                          {item.displayName}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={1}
                          value={item.gramsText}
                          onChange={(event) =>
                            setEditItems(
                              editItems.map((current, i) =>
                                i === index
                                  ? { ...current, gramsText: event.target.value }
                                  : current,
                              ),
                            )
                          }
                          aria-label={`${item.displayName}のグラム`}
                          style={styles.editGramsInput}
                        />
                        <span style={styles.subtext}>g</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditItems(editItems.filter((_, i) => i !== index))
                          }
                          aria-label={`${item.displayName}を取り消す`}
                          style={styles.cancelDelete}
                        >
                          取消
                        </button>
                      </li>
                    ))}
                  </ul>
                  {editItems.length === 0 && (
                    <p style={styles.subtext}>
                      品目が0件になる場合は、記録の削除を使ってください。
                    </p>
                  )}
                  <div style={styles.editAddBox}>
                    <p style={styles.sectionTitle}>食材を追加</p>
                    <FoodSearchBox onAdd={handleAddToEdit} />
                  </div>
                  <div style={styles.confirmRow}>
                    <button
                      type="button"
                      onClick={() => void handleEditSave(meal.meal_id)}
                      disabled={!canSaveEdit}
                      style={{
                        ...styles.confirmDelete,
                        borderColor: "var(--color-primary)",
                        color: "var(--color-primary)",
                        opacity: canSaveEdit ? 1 : 0.5,
                      }}
                    >
                      保存する
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMealId(null)}
                      style={styles.cancelDelete}
                    >
                      やめる
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: "4px 0 8px", fontSize: "14px" }}>
                  {meal.items
                    .map((item) => `${item.display_name} ${item.intake_g}g`)
                    .join(" · ")}
                </p>
              )}
              {editingMealId !== meal.meal_id &&
                (confirmingDelete === meal.meal_id ? (
                  <div style={styles.confirmRow}>
                    <span style={{ fontSize: "13px" }}>
                      この記録を削除する？（取り消せません）
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(meal.meal_id)}
                      style={styles.confirmDelete}
                    >
                      削除する
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(null)}
                      style={styles.cancelDelete}
                    >
                      やめる
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => startEditing(meal)}
                      aria-label={`${MEAL_TYPE_LABELS[meal.meal_type]}の記録を編集`}
                      style={styles.deleteButton}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(meal.meal_id)}
                      aria-label={`${MEAL_TYPE_LABELS[meal.meal_type]}の記録を削除`}
                      style={styles.deleteButton}
                    >
                      削除
                    </button>
                  </div>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const styles = {
  sectionTitle: { fontSize: "15px", margin: "0 0 8px" },
  subtext: { color: "var(--color-subtext)", fontSize: "13px", margin: 0 },
  list: { listStyle: "none", margin: 0, padding: 0 },
  savedCard: {
    padding: "10px 12px",
    marginBottom: "8px",
    border: "1px solid var(--color-surface)",
    borderRadius: "var(--radius-md)",
  },
  savedHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "8px",
  },
  editRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "var(--tap-target-min)",
    padding: "2px 0",
  },
  editAddBox: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid var(--color-surface)",
  },
  editGramsInput: {
    width: "80px",
    minHeight: "var(--tap-target-min)",
    padding: "0 10px",
    border: "1px solid var(--color-subtext)",
    borderRadius: "var(--radius-sm)",
    fontSize: "16px",
  },
  confirmRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  confirmDelete: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-text)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  cancelDelete: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--color-subtext)",
    fontSize: "13px",
    cursor: "pointer",
  },
  deleteButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--color-subtext)",
    fontSize: "13px",
    cursor: "pointer",
  },
} satisfies Record<string, React.CSSProperties>;
