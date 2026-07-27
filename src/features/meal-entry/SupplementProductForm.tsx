"use client";

import { useState } from "react";
import { SUPPLEMENT_NUTRIENTS } from "../../server/api/schemas/supplements";
import type { SupplementProduct } from "../../server/api/schemas/supplementProducts";
import {
  computeAmounts,
  nextNutrient,
  type Draft,
} from "./SupplementAmountFields";

/**
 * Create or edit a supplement product preset
 * (decision-20260724-supplement-products): name + a serving basis (数量 + 単位,
 * e.g. 10錠) + the composition at that basis. Composition is self-reported.
 * Passing `product` switches to edit mode (PUT, prefilled); otherwise it
 * creates (POST). On success the parent refreshes the list and closes (onSaved).
 */
export function SupplementProductForm({
  product,
  onSaved,
  onCancel,
}: {
  product?: SupplementProduct;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEditing = product !== undefined;
  const [name, setName] = useState(product?.name ?? "");
  const [servingText, setServingText] = useState(
    product ? String(product.serving_count) : "10",
  );
  const [servingUnit, setServingUnit] = useState(product?.serving_unit ?? "錠");
  const [rows, setRows] = useState<Draft[]>(
    product
      ? product.amounts.map((a) => ({
          nutrientCode: a.nutrient_code,
          amountText: String(a.amount),
        }))
      : [{ nutrientCode: SUPPLEMENT_NUTRIENTS[0].code, amountText: "" }],
  );
  const [error, setError] = useState(false);

  const { validAmounts, hasDuplicate } = computeAmounts(rows);
  const serving = Number(servingText);
  const canSave =
    name.trim() !== "" &&
    Number.isFinite(serving) &&
    serving > 0 &&
    servingUnit.trim() !== "" &&
    validAmounts.length > 0 &&
    !hasDuplicate;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setError(false);
    try {
      const response = await fetch(
        isEditing
          ? `/api/supplement-products/${product.product_id}`
          : "/api/supplement-products",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            serving_count: serving,
            serving_unit: servingUnit.trim(),
            amounts: validAmounts,
          }),
        },
      );
      if (!response.ok) {
        setError(true);
        return;
      }
      onSaved();
    } catch {
      setError(true);
    }
  };

  return (
    <div style={styles.createBox}>
      <p style={styles.formHeading}>
        {isEditing ? "製品を編集" : "製品を登録"}
      </p>
      <label style={styles.label} htmlFor="product-name">
        製品名
      </label>
      <input
        id="product-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="エビオス錠 など"
        maxLength={100}
        style={styles.textInput}
      />

      <span style={styles.label}>成分の基準量</span>
      <div style={styles.servingRow}>
        <input
          type="number"
          inputMode="decimal"
          min="1"
          value={servingText}
          onChange={(e) => setServingText(e.target.value)}
          aria-label="基準の数量"
          style={styles.servingInput}
        />
        <input
          type="text"
          value={servingUnit}
          onChange={(e) => setServingUnit(e.target.value)}
          aria-label="単位"
          maxLength={10}
          style={styles.unitInput}
        />
        <span style={styles.note}>あたりの成分を入力</span>
      </div>

      {rows.map((row, index) => (
        <div key={index} style={styles.amountRow}>
          <select
            value={row.nutrientCode}
            onChange={(e) =>
              setRows((rs) =>
                rs.map((r, i) =>
                  i === index ? { ...r, nutrientCode: e.target.value } : r,
                ),
              )
            }
            aria-label="栄養素"
            style={styles.select}
          >
            {SUPPLEMENT_NUTRIENTS.map((n) => (
              <option key={n.code} value={n.code}>
                {n.name}（{n.unit}）
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={row.amountText}
            onChange={(e) =>
              setRows((rs) =>
                rs.map((r, i) =>
                  i === index ? { ...r, amountText: e.target.value } : r,
                ),
              )
            }
            aria-label="量"
            style={styles.amountInput}
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, i) => i !== index))}
              style={styles.removeRow}
              aria-label="この栄養素を外す"
            >
              ×
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          setRows([...rows, { nutrientCode: nextNutrient(rows), amountText: "" }])
        }
        style={styles.addRow}
      >
        ＋ 栄養素を追加
      </button>

      {hasDuplicate && <p style={styles.note}>同じ栄養素が重複しています。</p>}

      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          style={{ ...styles.saveButton, opacity: canSave ? 1 : 0.5 }}
        >
          {isEditing ? "更新" : "製品を登録"}
        </button>
        <button type="button" onClick={onCancel} style={styles.cancelButton}>
          やめる
        </button>
      </div>
      {error && (
        <p role="status" style={styles.note}>
          {isEditing
            ? "更新できませんでした。もう一度お試しください。"
            : "登録できませんでした。もう一度お試しください。"}
        </p>
      )}
    </div>
  );
}

const styles = {
  formHeading: {
    fontSize: "14px",
    fontWeight: 700,
    margin: "0 0 4px",
  },
  note: {
    color: "var(--color-subtext)",
    fontSize: "12px",
    lineHeight: 1.7,
    margin: "8px 0 0",
  },
  createBox: { marginTop: "10px" },
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
    boxSizing: "border-box" as const,
  },
  servingRow: { display: "flex", alignItems: "center", gap: "8px" },
  servingInput: {
    width: "64px",
    minHeight: "var(--tap-target-min)",
    padding: "0 8px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "16px",
  },
  unitInput: {
    width: "56px",
    minHeight: "var(--tap-target-min)",
    padding: "0 8px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "16px",
  },
  amountRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginTop: "8px",
  },
  select: {
    flex: "1 1 auto",
    minHeight: "var(--tap-target-min)",
    padding: "0 8px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "14px",
  },
  amountInput: {
    width: "88px",
    minHeight: "var(--tap-target-min)",
    padding: "0 10px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "16px",
  },
  removeRow: {
    minWidth: "var(--tap-target-min)",
    minHeight: "var(--tap-target-min)",
    border: "none",
    background: "transparent",
    color: "var(--color-subtext)",
    fontSize: "20px",
    cursor: "pointer",
  },
  addRow: {
    minHeight: "var(--tap-target-min)",
    marginTop: "8px",
    padding: "0 14px",
    border: "1px dashed var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "13px",
    cursor: "pointer",
  },
  saveButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 18px",
    border: "none",
    borderRadius: "8px",
    background: "var(--color-primary)",
    color: "var(--color-base)",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  cancelButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 16px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "14px",
    cursor: "pointer",
  },
} satisfies Record<string, React.CSSProperties>;
