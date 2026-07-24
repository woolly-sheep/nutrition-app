"use client";

import { useCallback, useEffect, useState } from "react";
import { formatAmount } from "../../components/RemainingCard";
import { SUPPLEMENT_NUTRIENTS } from "../../server/api/schemas/supplements";
import type { SupplementProduct } from "../../server/api/schemas/supplementProducts";

/**
 * 製品プリセット (decision-20260724-supplement-products). Save a product's
 * composition per a serving basis (e.g. エビオス錠「10錠あたり」) once, then log
 * "飲んだ数" — the amounts scale by count / serving_count and are saved as a
 * normal supplement record for that day. Composition is self-reported.
 */

type Props = {
  /** The record day a logged dose is written to. */
  date: string;
  /** Called after a dose is logged so the parent can refresh saved records. */
  onLogged: () => void;
};

type AmountDraft = { nutrientCode: string; amountText: string };

const NUTRIENT_BY_CODE = new Map(SUPPLEMENT_NUTRIENTS.map((n) => [n.code, n]));

export function SupplementProductManager({ date, onLogged }: Props) {
  const [products, setProducts] = useState<readonly SupplementProduct[]>([]);
  const [doseText, setDoseText] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [servingText, setServingText] = useState("10");
  const [servingUnit, setServingUnit] = useState("錠");
  const [rows, setRows] = useState<AmountDraft[]>([
    { nutrientCode: SUPPLEMENT_NUTRIENTS[0].code, amountText: "" },
  ]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/supplement-products");
      if (response.ok) {
        const body = (await response.json()) as { products: SupplementProduct[] };
        setProducts(body.products);
      }
    } catch {
      // presets are optional — free-form entry still works
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const validAmounts = rows
    .map((r) => ({ nutrient_code: r.nutrientCode, amount: Number(r.amountText) }))
    .filter((r) => Number.isFinite(r.amount) && r.amount > 0);
  const serving = Number(servingText);
  const hasDuplicate =
    new Set(validAmounts.map((a) => a.nutrient_code)).size !== validAmounts.length;
  const canCreate =
    name.trim() !== "" &&
    Number.isFinite(serving) &&
    serving > 0 &&
    servingUnit.trim() !== "" &&
    validAmounts.length > 0 &&
    !hasDuplicate;

  const handleCreate = async () => {
    if (!canCreate) {
      return;
    }
    setError(false);
    try {
      const response = await fetch("/api/supplement-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          serving_count: serving,
          serving_unit: servingUnit.trim(),
          amounts: validAmounts,
        }),
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      setName("");
      setServingText("10");
      setServingUnit("錠");
      setRows([{ nutrientCode: SUPPLEMENT_NUTRIENTS[0].code, amountText: "" }]);
      setCreating(false);
      await load();
    } catch {
      setError(true);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/supplement-products/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await load();
      }
    } catch {
      // list unchanged on failure
    }
  };

  const handleLog = async (product: SupplementProduct) => {
    const count = Number(doseText[product.product_id]);
    if (!Number.isFinite(count) || count <= 0) {
      return;
    }
    const factor = count / product.serving_count;
    const amounts = product.amounts.map((a) => ({
      nutrient_code: a.nutrient_code,
      amount: a.amount * factor,
    }));
    try {
      const response = await fetch("/api/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          product_name: `${product.name}（${formatAmount(count)}${product.serving_unit}）`,
          amounts,
        }),
      });
      if (response.ok) {
        setDoseText((prev) => ({ ...prev, [product.product_id]: "" }));
        onLogged();
      }
    } catch {
      // leave the field as-is on failure
    }
  };

  return (
    <div style={styles.wrap}>
      <p style={styles.heading}>登録した製品</p>

      {products.length === 0 && (
        <p style={styles.note}>
          エビオス錠のように繰り返し飲む製品は、成分を1回登録すると次から錠数だけで記録できます。
        </p>
      )}

      {products.map((product) => (
        <div key={product.product_id} style={styles.productRow}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "14px" }}>{product.name}</span>
            <span style={styles.productAmounts}>
              {product.serving_count}
              {product.serving_unit}あたり{" "}
              {product.amounts
                .map((a) => {
                  const meta = NUTRIENT_BY_CODE.get(a.nutrient_code);
                  return `${meta?.name ?? a.nutrient_code} ${formatAmount(a.amount)}${meta?.unit ?? ""}`;
                })
                .join(" ・ ")}
            </span>
            <div style={styles.logRow}>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={doseText[product.product_id] ?? ""}
                onChange={(e) =>
                  setDoseText((prev) => ({
                    ...prev,
                    [product.product_id]: e.target.value,
                  }))
                }
                aria-label={`${product.name}を飲んだ${product.serving_unit}数`}
                style={styles.doseInput}
              />
              <span style={styles.doseUnit}>{product.serving_unit}</span>
              <button
                type="button"
                onClick={() => void handleLog(product)}
                style={styles.logButton}
              >
                記録
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteProduct(product.product_id)}
                style={styles.deleteProduct}
                aria-label={`${product.name}を削除`}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      ))}

      {creating ? (
        <div style={styles.createBox}>
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
              setRows([
                ...rows,
                { nutrientCode: nextNutrient(rows), amountText: "" },
              ])
            }
            style={styles.addRow}
          >
            ＋ 栄養素を追加
          </button>

          {hasDuplicate && (
            <p style={styles.note}>同じ栄養素が重複しています。</p>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!canCreate}
              style={{ ...styles.saveButton, opacity: canCreate ? 1 : 0.5 }}
            >
              製品を登録
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              style={styles.cancelButton}
            >
              やめる
            </button>
          </div>
          {error && (
            <p role="status" style={styles.note}>
              登録できませんでした。もう一度お試しください。
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={styles.addProduct}
        >
          ＋ 製品を登録
        </button>
      )}
    </div>
  );
}

function nextNutrient(rows: readonly AmountDraft[]): string {
  const used = new Set(rows.map((r) => r.nutrientCode));
  return (
    SUPPLEMENT_NUTRIENTS.find((n) => !used.has(n.code))?.code ??
    SUPPLEMENT_NUTRIENTS[0].code
  );
}

const styles = {
  wrap: {
    border: "1px solid var(--color-surface)",
    borderRadius: "10px",
    padding: "12px",
    marginBottom: "16px",
  },
  heading: { fontSize: "14px", fontWeight: 700, margin: "0 0 8px" },
  note: {
    color: "var(--color-subtext)",
    fontSize: "12px",
    lineHeight: 1.7,
    margin: "8px 0 0",
  },
  productRow: {
    display: "flex",
    padding: "8px 0",
    borderBottom: "1px solid var(--color-surface)",
  },
  productAmounts: {
    display: "block",
    fontSize: "12px",
    color: "var(--color-subtext)",
    margin: "2px 0 6px",
  },
  logRow: { display: "flex", alignItems: "center", gap: "6px" },
  doseInput: {
    width: "64px",
    minHeight: "var(--tap-target-min)",
    padding: "0 8px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "16px",
  },
  doseUnit: { fontSize: "13px", color: "var(--color-subtext)" },
  logButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 16px",
    border: "none",
    borderRadius: "8px",
    background: "var(--color-primary)",
    color: "var(--color-base)",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  deleteProduct: {
    minHeight: "var(--tap-target-min)",
    padding: "0 10px",
    border: "none",
    background: "transparent",
    color: "var(--color-subtext)",
    fontSize: "13px",
    cursor: "pointer",
  },
  addProduct: {
    minHeight: "var(--tap-target-min)",
    marginTop: "10px",
    padding: "0 14px",
    border: "1px dashed var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "13px",
    cursor: "pointer",
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
