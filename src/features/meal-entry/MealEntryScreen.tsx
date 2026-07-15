"use client";

import { useState } from "react";
import type { MealType } from "../../server/api/schemas/meals";
import { FoodSearchBox, type DraftItem } from "../food-search/FoodSearchBox";

/**
 * 記録 tab (UI design v0.1 §4.2). P0 scope: search + grams input +
 * add preview + save. いつもの食事 / 不足を補う候補 are P2.
 * Draft items use the 5a "add preview" coding (dashed border) until saved.
 */

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

export function MealEntryScreen() {
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [draftItems, setDraftItems] = useState<readonly DraftItem[]>([]);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const today = todayIsoDate();
  const totalKcal = draftItems.reduce(
    (sum, item) => sum + (item.estimatedKcal ?? 0),
    0,
  );

  const handleAdd = (item: DraftItem) => {
    setDraftItems([...draftItems, item]);
    setSaveState("idle");
  };

  const handleRemove = (index: number) => {
    setDraftItems(draftItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (draftItems.length === 0 || saveState === "saving") {
      return;
    }
    setSaveState("saving");
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          meal_type: mealType,
          items: draftItems.map((item) => ({
            food_id: item.foodId,
            intake_g: item.intakeG,
          })),
        }),
      });
      if (!response.ok) {
        setSaveState("error");
        return;
      }
      setDraftItems([]);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div>
      <header style={styles.header}>
        <p style={styles.date}>{formatJapaneseDate(today)}</p>
        <h1 style={styles.title}>{MEAL_TYPE_LABELS[mealType]}を記録</h1>
        <div role="group" aria-label="食事区分" style={styles.mealTypeRow}>
          {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              aria-pressed={mealType === type}
              style={{
                ...styles.mealTypeButton,
                background:
                  mealType === type
                    ? "var(--color-primary)"
                    : "var(--color-base)",
                color:
                  mealType === type
                    ? "var(--color-base)"
                    : "var(--color-subtext)",
              }}
            >
              {MEAL_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </header>

      <FoodSearchBox onAdd={handleAdd} />

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
                  onClick={() => handleRemove(index)}
                  aria-label={`${item.displayName}を取り消す`}
                  style={styles.removeButton}
                >
                  取消
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={draftItems.length === 0 || saveState === "saving"}
        style={{
          ...styles.saveButton,
          opacity: draftItems.length === 0 ? 0.5 : 1,
        }}
      >
        {MEAL_TYPE_LABELS[mealType]}を保存（{draftItems.length}品 ·{" "}
        {Math.round(totalKcal)} kcal）
      </button>

      {saveState === "saved" && (
        <p role="status" style={styles.savedNote}>
          保存しました。ホームで今日のサマリーを確認できます。
        </p>
      )}
      {saveState === "error" && (
        <p role="status" style={styles.subtext}>
          保存できませんでした。入力内容を確認して、もう一度お試しください。
        </p>
      )}

      <footer style={styles.footer}>
        <p style={styles.subtext}>
          出典: 日本食品標準成分表(八訂)。表示は推定値です。
        </p>
      </footer>
    </div>
  );
}

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatJapaneseDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function defaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

const styles = {
  header: { marginBottom: "16px" },
  date: { margin: 0, color: "var(--color-subtext)", fontSize: "13px" },
  title: { margin: "4px 0 12px", fontSize: "20px" },
  mealTypeRow: { display: "flex", gap: "8px" },
  mealTypeButton: {
    minHeight: "var(--tap-target-min)",
    flex: 1,
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
  sectionTitle: { fontSize: "15px", margin: "0 0 8px" },
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
    borderRadius: "8px",
    background: "rgba(47, 140, 126, 0.08)",
  },
  removeButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "var(--color-subtext)",
    cursor: "pointer",
  },
  saveButton: {
    width: "100%",
    minHeight: "var(--tap-target-min)",
    marginTop: "16px",
    border: "none",
    borderRadius: "8px",
    background: "var(--color-primary)",
    color: "var(--color-base)",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  savedNote: {
    marginTop: "12px",
    padding: "12px",
    borderRadius: "8px",
    background: "var(--color-surface)",
    fontSize: "14px",
  },
  subtext: { color: "var(--color-subtext)", fontSize: "13px", margin: 0 },
  footer: { marginTop: "24px" },
} satisfies Record<string, React.CSSProperties>;
