"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  FoodCandidatesResponse,
} from "../../server/api/handlers/getFoodCandidates";
import type {
  UsualFoodsResponse,
} from "../../server/api/handlers/getUsualFoods";
import type { DayMeal } from "../../server/api/handlers/listDayMeals";
import type { MealType } from "../../server/api/schemas/meals";
import { FoodSearchBox, type DraftItem } from "../food-search/FoodSearchBox";

/**
 * 記録 tab (UI design v0.1 §4.2 + v0.3 addendum). Search + grams input +
 * add preview + save, plus two P2 shortcuts: いつもの食事 (derived from
 * recent records, no persisted favorites) and 不足を補う候補 (tied to
 * today's analysis, facts only, mandatory non-recommendation notice).
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
  const [usual, setUsual] = useState<UsualFoodsResponse | null>(null);
  const [candidates, setCandidates] = useState<FoodCandidatesResponse | null>(
    null,
  );
  const [date, setDate] = useState<string>(todayIsoDate());
  const [savedMeals, setSavedMeals] = useState<readonly DayMeal[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const today = todayIsoDate();

  // v0.5 §1: 分析タブ等から /meals?date= で該当日を開ける
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("date");
    if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= todayIsoDate()) {
      setDate(requested);
    }
  }, []);

  const loadShortcuts = useCallback(async () => {
    try {
      const [usualResponse, candidatesResponse, mealsResponse] =
        await Promise.all([
          fetch(`/api/meals/usual?meal_type=${mealType}&date=${date}`),
          fetch(`/api/analysis/candidates?date=${date}`),
          fetch(`/api/meals?date=${date}`),
        ]);
      if (usualResponse.ok) {
        setUsual((await usualResponse.json()) as UsualFoodsResponse);
      }
      if (candidatesResponse.ok) {
        setCandidates(
          (await candidatesResponse.json()) as FoodCandidatesResponse,
        );
      }
      if (mealsResponse.ok) {
        const data = (await mealsResponse.json()) as { meals: DayMeal[] };
        setSavedMeals(data.meals);
      }
    } catch {
      // shortcuts are supplementary — search and save still work
    }
  }, [mealType, date]);

  useEffect(() => {
    void loadShortcuts();
  }, [loadShortcuts]);

  const shiftDate = (days: number) => {
    const next = isoDatePlusDays(date, days);
    if (next > today) {
      return;
    }
    setDate(next);
    setConfirmingDelete(null);
    setSaveState("idle");
  };

  const handleDelete = async (mealId: string) => {
    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setConfirmingDelete(null);
        void loadShortcuts();
      }
    } catch {
      // list stays as-is; the user can retry
    }
  };
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
          date,
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
      void loadShortcuts();
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div>
      <header style={styles.header}>
        <div style={styles.dateNav}>
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            aria-label="前の日へ"
            style={styles.dateNavButton}
          >
            ←
          </button>
          <p style={styles.date}>
            {formatJapaneseDate(date)}
            {date !== today && "（過去の記録）"}
          </p>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            disabled={date === today}
            aria-label="次の日へ"
            style={{
              ...styles.dateNavButton,
              opacity: date === today ? 0.3 : 1,
            }}
          >
            →
          </button>
        </div>
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

      {usual !== null && usual.items.length > 0 && (
        <section style={{ marginTop: "24px" }}>
          <h2 style={styles.sectionTitle}>
            いつもの{MEAL_TYPE_LABELS[mealType]}
            <span style={styles.sectionHint}>（最近の記録から）</span>
          </h2>
          <ul style={styles.shortcutList}>
            {usual.items.map((item) => (
              <li key={item.food_id} style={styles.shortcutRow}>
                <span style={{ flex: 1 }}>
                  {item.display_name} {item.intake_g}g
                  {item.estimated_kcal !== null && (
                    <span style={styles.subtext}>
                      {" "}
                      {Math.round(item.estimated_kcal)} kcal
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleAdd({
                      foodId: item.food_id,
                      displayName: item.display_name,
                      intakeG: item.intake_g,
                      estimatedKcal: item.estimated_kcal,
                    })
                  }
                  aria-label={`${item.display_name}を追加`}
                  style={styles.shortcutAdd}
                >
                  ＋
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {candidates !== null &&
        candidates.has_analysis &&
        candidates.candidates.length > 0 && (
          <section style={{ marginTop: "24px" }}>
            <h2 style={styles.sectionTitle}>不足を補う候補</h2>
            <ul style={styles.shortcutList}>
              {candidates.candidates.map((candidate) => (
                <li
                  key={`${candidate.target_nutrient_code}-${candidate.food_id}`}
                  style={styles.shortcutRow}
                >
                  <span style={{ flex: 1 }}>
                    {candidate.display_name}{" "}
                    {candidate.portion_label ?? `${candidate.portion_g}g`}
                    {candidate.estimated_kcal !== null && (
                      <span style={styles.subtext}>
                        {" "}
                        {Math.round(candidate.estimated_kcal)} kcal
                      </span>
                    )}
                    <span style={styles.subtext}>
                      {" · "}
                      {candidate.target_nutrient_name}不足分の約
                      {Math.round(candidate.percent_of_shortfall)}%
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAdd({
                        foodId: candidate.food_id,
                        displayName: candidate.display_name,
                        intakeG: candidate.portion_g,
                        estimatedKcal: candidate.estimated_kcal,
                      })
                    }
                    aria-label={`${candidate.display_name}を追加`}
                    style={styles.shortcutAdd}
                  >
                    ＋追加
                  </button>
                </li>
              ))}
            </ul>
            <p style={styles.subtext}>{candidates.notice}</p>
          </section>
        )}

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

      <section style={{ marginTop: "28px" }}>
        <h2 style={styles.sectionTitle}>この日の記録</h2>
        {savedMeals.length === 0 ? (
          <p style={styles.subtext}>この日の記録はまだありません。</p>
        ) : (
          <ul style={styles.shortcutList}>
            {savedMeals.map((meal) => (
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
                <p style={{ margin: "4px 0 8px", fontSize: "14px" }}>
                  {meal.items
                    .map((item) => `${item.display_name} ${item.intake_g}g`)
                    .join(" · ")}
                </p>
                {confirmingDelete === meal.meal_id ? (
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
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(meal.meal_id)}
                    aria-label={`${MEAL_TYPE_LABELS[meal.meal_type]}の記録を削除`}
                    style={styles.deleteButton}
                  >
                    削除
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

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

function isoDatePlusDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

const styles = {
  header: { marginBottom: "16px" },
  date: { margin: 0, color: "var(--color-subtext)", fontSize: "13px" },
  dateNav: { display: "flex", alignItems: "center", gap: "8px" },
  dateNavButton: {
    minHeight: "var(--tap-target-min)",
    minWidth: "var(--tap-target-min)",
    border: "1px solid var(--color-surface)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "16px",
    cursor: "pointer",
  },
  savedCard: {
    padding: "10px 12px",
    marginBottom: "8px",
    // saved = confirmed facts: solid border (5a; dashed is preview-only)
    border: "1px solid var(--color-surface)",
    borderRadius: "10px",
  },
  savedHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "8px",
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
    borderRadius: "8px",
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
    borderRadius: "8px",
    background: "transparent",
    color: "var(--color-subtext)",
    fontSize: "13px",
    cursor: "pointer",
  },
  deleteButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "var(--color-subtext)",
    fontSize: "13px",
    cursor: "pointer",
  },
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
  sectionHint: {
    fontSize: "12px",
    fontWeight: 400,
    color: "var(--color-subtext)",
  },
  shortcutList: { listStyle: "none", margin: 0, padding: 0 },
  shortcutRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "var(--tap-target-min)",
    padding: "4px 0",
    borderBottom: "1px solid var(--color-surface)",
    fontSize: "14px",
  },
  shortcutAdd: {
    minHeight: "var(--tap-target-min)",
    minWidth: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
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
