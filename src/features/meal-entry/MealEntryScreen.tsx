"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FoodCandidatesResponse,
} from "../../server/api/handlers/getFoodCandidates";
import type {
  UsualFoodsResponse,
} from "../../server/api/handlers/getUsualFoods";
import type { DayMeal } from "../../server/api/handlers/listDayMeals";
import type { RecipeView } from "../../server/api/handlers/listRecipes";
import type { MealType } from "../../server/api/schemas/meals";
import { FoodSearchBox, type DraftItem } from "../food-search/FoodSearchBox";
import { NutrientFinder } from "../food-search/NutrientFinder";
import { SupplementPanel } from "./SupplementPanel";
import { RecipeSection } from "./RecipeSection";
import { SavedMealsList } from "./SavedMealsList";
import { UsualFoodsSection } from "./UsualFoodsSection";
import { ShortfallCandidatesSection } from "./ShortfallCandidatesSection";
import { DraftMealSection } from "./DraftMealSection";

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
  const [recipes, setRecipes] = useState<readonly RecipeView[]>([]);
  // #58: split the tab into 追加する (input) and この日の記録 (review) so the
  // long single scroll no longer mixes the two, and the save action stays put.
  const [zone, setZone] = useState<"add" | "log">("add");

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
      const [usualResponse, candidatesResponse, mealsResponse, recipesResponse] =
        await Promise.all([
          fetch(`/api/meals/usual?meal_type=${mealType}&date=${date}`),
          fetch(`/api/analysis/candidates?date=${date}`),
          fetch(`/api/meals?date=${date}`),
          fetch(`/api/recipes`),
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
      if (recipesResponse.ok) {
        const data = (await recipesResponse.json()) as { recipes: RecipeView[] };
        setRecipes(data.recipes);
      }
    } catch {
      // shortcuts are supplementary — search and save still work
    }
  }, [mealType, date]);

  useEffect(() => {
    void loadShortcuts();
  }, [loadShortcuts]);

  // One-tap add from the home "あと少し" nudge (/meals?add=<food_id>).
  // Prefills a draft from the server-validated candidate — never auto-saves.
  const addParamHandled = useRef(false);
  useEffect(() => {
    if (addParamHandled.current || !candidates?.has_analysis) {
      return;
    }
    const requested = new URLSearchParams(window.location.search).get("add");
    if (!requested) {
      return;
    }
    const candidate = candidates.candidates.find((c) => c.food_id === requested);
    if (!candidate) {
      return;
    }
    addParamHandled.current = true;
    setDraftItems((prev) =>
      prev.some((item) => item.foodId === candidate.food_id)
        ? prev
        : [
            ...prev,
            {
              foodId: candidate.food_id,
              displayName: candidate.display_name,
              intakeG: candidate.portion_g,
              estimatedKcal: candidate.estimated_kcal,
            },
          ],
    );
    setSaveState("idle");
  }, [candidates]);

  const shiftDate = (days: number) => {
    const next = isoDatePlusDays(date, days);
    if (next > today) {
      return;
    }
    setDate(next);
    setSaveState("idle");
  };
  const totalKcal = draftItems.reduce(
    (sum, item) => sum + (item.estimatedKcal ?? 0),
    0,
  );

  const handleAdd = (item: DraftItem) => {
    setDraftItems([...draftItems, item]);
    setSaveState("idle");
  };

  // Log a saved recipe: append its (servings-scaled) foods to the current
  // draft. Never auto-saves — the user reviews grams / meal type, then saves.
  const handleAddRecipeItems = (items: DraftItem[]) => {
    setDraftItems((prev) => [...prev, ...items]);
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
        <div role="tablist" aria-label="記録の表示" style={styles.zoneRow}>
          <button
            type="button"
            role="tab"
            aria-selected={zone === "add"}
            onClick={() => setZone("add")}
            style={{
              ...styles.zoneButton,
              ...(zone === "add"
                ? styles.zoneButtonActive
                : styles.zoneButtonIdle),
            }}
          >
            追加する
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={zone === "log"}
            onClick={() => setZone("log")}
            style={{
              ...styles.zoneButton,
              ...(zone === "log"
                ? styles.zoneButtonActive
                : styles.zoneButtonIdle),
            }}
          >
            この日の記録{savedMeals.length > 0 ? ` · ${savedMeals.length}` : ""}
          </button>
        </div>
      </header>

      {zone === "add" ? (
        <>
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

          <FoodSearchBox onAdd={handleAdd} />

      <details style={{ marginTop: "12px" }}>
        <summary style={styles.finderSummary}>栄養素から探す</summary>
        <div style={{ marginTop: "8px" }}>
          <NutrientFinder onAdd={handleAdd} />
        </div>
      </details>

      {usual !== null && (
        <UsualFoodsSection
          mealTypeLabel={MEAL_TYPE_LABELS[mealType]}
          items={usual.items}
          onAdd={handleAdd}
        />
      )}

      <RecipeSection
        recipes={recipes}
        onAddToDraft={handleAddRecipeItems}
        onChanged={() => void loadShortcuts()}
      />

      <ShortfallCandidatesSection candidates={candidates} onAdd={handleAdd} />

      <DraftMealSection
        draftItems={draftItems}
        onRemove={handleRemove}
        onRecipeSaved={() => void loadShortcuts()}
      />

          {saveState === "saved" && (
            <p role="status" style={styles.savedNote}>
              保存しました。「この日の記録」で確認できます。
            </p>
          )}
          {saveState === "error" && (
            <p role="status" style={styles.subtext}>
              保存できませんでした。入力内容を確認して、もう一度お試しください。
            </p>
          )}

          <details style={{ marginTop: "28px" }}>
            <summary style={styles.supplementSummary}>
              サプリメントを記録
            </summary>
            <div style={{ marginTop: "10px" }}>
              <SupplementPanel date={date} />
            </div>
          </details>

          <div style={styles.saveBarWrap}>
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
          </div>
        </>
      ) : savedMeals.length > 0 ? (
        <SavedMealsList
          meals={savedMeals}
          onChanged={() => void loadShortcuts()}
        />
      ) : (
        <p style={styles.emptyLog}>
          この日の記録はまだありません。「追加する」から記録できます。
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
  title: { margin: "4px 0 12px", fontSize: "20px" },
  zoneRow: { display: "flex", gap: "8px", marginTop: "12px" },
  zoneButton: {
    minHeight: "var(--tap-target-min)",
    flex: 1,
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  zoneButtonActive: {
    border: "1px solid var(--color-primary)",
    background: "var(--color-primary)",
    color: "var(--color-base)",
  },
  zoneButtonIdle: {
    border: "1px solid var(--color-surface)",
    background: "var(--color-base)",
    color: "var(--color-subtext)",
  },
  emptyLog: {
    color: "var(--color-subtext)",
    fontSize: "14px",
    margin: "24px 0",
  },
  mealTypeRow: { display: "flex", gap: "8px" },
  mealTypeButton: {
    minHeight: "var(--tap-target-min)",
    flex: 1,
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
  finderSummary: {
    minHeight: "var(--tap-target-min)",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontSize: "14px",
    color: "var(--color-primary)",
    fontWeight: 700,
  },
  saveBarWrap: {
    position: "sticky" as const,
    // Clear the fixed bottom TabBar so the primary action is always reachable.
    bottom: "calc(var(--tap-target-min) + 12px)",
    zIndex: 5,
    marginTop: "20px",
    paddingTop: "10px",
    paddingBottom: "2px",
    background: "var(--color-base)",
    boxShadow: "0 -10px 16px -10px rgba(32, 42, 44, 0.14)",
  },
  saveButton: {
    width: "100%",
    minHeight: "var(--tap-target-min)",
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
  supplementSummary: {
    minHeight: "var(--tap-target-min)",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontSize: "14px",
    color: "var(--color-primary)",
    fontWeight: 700,
  },
} satisfies Record<string, React.CSSProperties>;
