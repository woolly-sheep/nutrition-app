"use client";

import { useState } from "react";
import { formatAmount } from "../../domain/format/amount";
import type {
  FoodNutrientEntry,
  FoodNutrientsResponse,
  FoodUnitOption,
} from "../../server/api/schemas/foods";

/**
 * 食材の栄養価ビュー (issue: 食材ごとの栄養価). Reads "何の食材か → 何が強みか
 * → 全量" top-down: energy + P/F/C split, then the standout nutrients, then the
 * full list grouped. All amounts are the per-100g seed values scaled to the
 * chosen serving (linear); percents scale the same way and the bar is capped at
 * 100% so an overshoot never looks "more done". Facts only — no medical framing.
 */

type ServingChoice = { label: string; grams: number };

// Group + order for the full list (macros → minerals → vitamins). Salt rides
// with the macros as the one "keep-low" item; it carries no gain percent.
const GROUPS: { label: string; codes: readonly string[] }[] = [
  {
    label: "エネルギー産生・食物繊維",
    codes: ["protein_g", "fat_g", "carbohydrate_g", "dietary_fiber_g", "salt_equivalent_g"],
  },
  {
    label: "ミネラル",
    codes: ["potassium_mg", "calcium_mg", "iron_mg", "zinc_mg", "magnesium_mg", "copper_mg"],
  },
  {
    label: "ビタミン",
    codes: [
      "vitamin_a_ug", "vitamin_d_ug", "vitamin_e_mg", "vitamin_k_ug",
      "vitamin_b1_mg", "vitamin_b2_mg", "niacin_mgne", "vitamin_b6_mg",
      "vitamin_b12_ug", "folate_ug", "vitamin_c_mg",
    ],
  },
];

export function FoodNutrientView({
  data,
  unitOptions,
  onReset,
}: {
  data: FoodNutrientsResponse;
  /** Serving options from the search selection (for the per-serving toggle). */
  unitOptions: readonly FoodUnitOption[];
  /** Back to search ("別の食材を調べる"). */
  onReset?: () => void;
}) {
  const servings = buildServings(unitOptions);
  const [servingIndex, setServingIndex] = useState(0);
  const serving = servings[servingIndex] ?? servings[0];
  const factor = serving.grams / 100;

  const byCode = new Map(data.nutrients.map((n) => [n.nutrient_code, n]));

  // "特に多く含む": comparable nutrients ranked by their share of the reference.
  const strengths = data.nutrients
    .filter((n) => n.percent_of_reference !== null)
    .sort((a, b) => (b.percent_of_reference ?? 0) - (a.percent_of_reference ?? 0))
    .slice(0, 4);

  return (
    <div>
      <div style={styles.head}>
        <div>
          <h3 style={styles.title}>{data.display_name}</h3>
          <p style={styles.sub}>
            {data.official_food_code} · {data.official_food_name}
          </p>
        </div>
        {onReset && (
          <button type="button" className="pressable" onClick={onReset} style={styles.reset}>
            別の食材
          </button>
        )}
      </div>

      {servings.length > 1 && (
        <div style={styles.servRow} role="group" aria-label="分量">
          {servings.map((s, i) => (
            <button
              key={s.label}
              type="button"
              className="pressable"
              aria-pressed={i === servingIndex}
              onClick={() => setServingIndex(i)}
              style={{
                ...styles.seg,
                ...(i === servingIndex ? styles.segOn : styles.segIdle),
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div style={styles.kcal}>
        <span style={styles.kcalV}>
          {data.energy_kcal_per_100g === null
            ? "—"
            : formatAmount(data.energy_kcal_per_100g * factor)}
        </span>
        <span style={styles.kcalU}>kcal / {serving.label}</span>
      </div>

      {data.macro_energy && (
        <div style={styles.block}>
          <p style={styles.blabel}>エネルギーの内訳（推定 %E）</p>
          <div style={styles.macro} aria-hidden="true">
            <span style={{ ...styles.macroSeg, width: `${data.macro_energy.protein_percent}%`, background: MACRO.protein }} />
            <span style={{ ...styles.macroSeg, width: `${data.macro_energy.fat_percent}%`, background: MACRO.fat }} />
            <span style={{ ...styles.macroSeg, width: `${data.macro_energy.carbohydrate_percent}%`, background: MACRO.carbohydrate }} />
          </div>
          <div style={styles.mlegend}>
            <span><span style={{ ...styles.mdot, background: MACRO.protein }} />たんぱく質 <b>{data.macro_energy.protein_percent}%</b></span>
            <span><span style={{ ...styles.mdot, background: MACRO.fat }} />脂質 <b>{data.macro_energy.fat_percent}%</b></span>
            <span><span style={{ ...styles.mdot, background: MACRO.carbohydrate }} />炭水化物 <b>{data.macro_energy.carbohydrate_percent}%</b></span>
          </div>
        </div>
      )}

      {strengths.length > 0 && (
        <div style={styles.block}>
          <p style={styles.blabel}>特に多く含む（1日の推奨量/目安量に対して）</p>
          {strengths.map((n) => (
            <NutrientLine key={n.nutrient_code} entry={n} factor={factor} strong />
          ))}
        </div>
      )}

      <div style={styles.block}>
        <p style={styles.blabel}>すべての栄養素</p>
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p style={styles.grouplabel}>{group.label}</p>
            {group.codes
              .map((code) => byCode.get(code))
              .filter((n): n is FoodNutrientEntry => n !== undefined)
              .map((n) => (
                <NutrientLine key={n.nutrient_code} entry={n} factor={factor} />
              ))}
          </div>
        ))}
      </div>

      <p style={styles.foot}>
        {data.notice}
        {!data.profile_applied && " ホームで基準の区分を設定すると、割合が表示されます。"}
      </p>
    </div>
  );
}

/** One nutrient row: name · bar (percent, capped) · scaled amount · percent. */
function NutrientLine({
  entry,
  factor,
  strong = false,
}: {
  entry: FoodNutrientEntry;
  factor: number;
  strong?: boolean;
}) {
  const percent = entry.percent_of_reference;
  const scaledPercent = percent === null ? null : percent * factor;
  const fill = scaledPercent === null ? 0 : Math.min(scaledPercent, 100);
  const amountLabel =
    entry.amount_per_100g === null
      ? entry.amount_label
      : `${formatAmount(entry.amount_per_100g * factor)} ${entry.unit}`;
  const pctLabel =
    scaledPercent === null ? "" : scaledPercent >= 100 ? "✓" : `${Math.round(scaledPercent)}%`;
  return (
    <div style={styles.nrow}>
      <span style={{ ...styles.nname, fontWeight: strong ? 700 : 400 }}>{entry.nutrient_name}</span>
      <span style={styles.track} aria-hidden="true">
        <span style={{ ...styles.fill, width: `${fill}%` }} />
      </span>
      <span style={styles.amt}>{amountLabel}</span>
      <span style={styles.pct}>{pctLabel}</span>
    </div>
  );
}

function buildServings(unitOptions: readonly FoodUnitOption[]): ServingChoice[] {
  const servings: ServingChoice[] = [{ label: "100g", grams: 100 }];
  for (const opt of unitOptions) {
    if (typeof opt.representative_weight_g === "number" && opt.representative_weight_g > 0) {
      servings.push({
        label: `1${opt.display_unit}（${formatAmount(opt.representative_weight_g)}g）`,
        grams: opt.representative_weight_g,
      });
    }
  }
  return servings.slice(0, 3);
}

// Decorative macro hues — informational, NOT status colours. Teal / clean
// apricot / sky: an appetising warm for fat that stays clear of any warning red;
// its orange-apricot tone is deliberately distinct from the yellow achievement
// gold, and it is never used as a badge.
const MACRO = {
  protein: "var(--color-primary)",
  fat: "#e8a06a",
  carbohydrate: "var(--color-sky)",
} as const;

const styles = {
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)" },
  title: { margin: 0, fontSize: "20px", color: "var(--color-text)" },
  sub: { margin: "2px 0 0", fontSize: "12px", color: "var(--color-subtext)" },
  reset: {
    flex: "none", minHeight: "var(--tap-target-min)", padding: "0 var(--space-3)",
    border: "1px solid var(--color-sky-line, rgba(93,180,204,.5))", borderRadius: "var(--radius-pill)",
    background: "var(--color-sky-soft)", color: "var(--color-sky-ink)", fontSize: "13px", fontWeight: 700, cursor: "pointer",
  },
  servRow: { display: "flex", gap: "var(--space-2)", margin: "var(--space-3) 0 var(--space-4)" },
  seg: { flex: 1, minHeight: "var(--tap-target-min)", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 700, cursor: "pointer" },
  segOn: { border: "1px solid var(--color-primary)", background: "var(--color-primary)", color: "var(--color-base)" },
  segIdle: { border: "1px solid var(--color-surface)", background: "var(--color-base)", color: "var(--color-subtext)" },
  kcal: { display: "flex", alignItems: "baseline", gap: "var(--space-2)", margin: "var(--space-3) 0" },
  kcalV: { fontFamily: "var(--font-numeric)", fontSize: "30px", color: "var(--color-primary-deep)", lineHeight: 1 },
  kcalU: { fontSize: "12px", color: "var(--color-subtext)" },
  block: { marginTop: "var(--space-5)" },
  blabel: { fontSize: "11px", letterSpacing: ".06em", color: "var(--color-subtext)", fontWeight: 700, margin: "0 0 var(--space-2)" },
  macro: { display: "flex", height: "16px", borderRadius: "var(--radius-pill)", overflow: "hidden" },
  macroSeg: { display: "block", height: "100%" },
  mlegend: { display: "flex", gap: "var(--space-4)", marginTop: "var(--space-2)", fontSize: "12px", color: "var(--color-text)", flexWrap: "wrap" as const },
  mdot: { width: "9px", height: "9px", borderRadius: "2px", display: "inline-block", marginRight: "5px", verticalAlign: "baseline" },
  grouplabel: { fontSize: "10.5px", letterSpacing: ".08em", color: "var(--color-sky-ink)", fontWeight: 700, margin: "var(--space-4) 0 6px" },
  nrow: { display: "flex", alignItems: "center", gap: "9px", padding: "6px 0", borderBottom: "1px solid rgba(32,60,56,.07)" },
  nname: { width: "92px", fontSize: "12.5px", color: "var(--color-text)", flex: "none" },
  track: { position: "relative" as const, flex: 1, height: "6px", borderRadius: "var(--radius-pill)", background: "repeating-linear-gradient(135deg, rgba(106,119,118,.26) 0 3px, transparent 3px 7px)" },
  fill: { position: "absolute" as const, inset: "0 auto 0 0", borderRadius: "var(--radius-pill)", background: "linear-gradient(90deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 62%, #fff))" },
  amt: { width: "82px", textAlign: "right" as const, fontSize: "12px", color: "var(--color-text)", fontVariantNumeric: "tabular-nums", flex: "none" },
  pct: { width: "34px", textAlign: "right" as const, fontSize: "11px", color: "var(--color-subtext)", flex: "none" },
  foot: { fontSize: "10.5px", color: "var(--color-subtext)", marginTop: "var(--space-4)", lineHeight: 1.6 },
} satisfies Record<string, React.CSSProperties>;
