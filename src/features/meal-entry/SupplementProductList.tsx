"use client";

import { formatAmount } from "../../components/RemainingCard";
import type { SupplementProduct } from "../../server/api/schemas/supplementProducts";
import { NUTRIENT_BY_CODE } from "./SupplementAmountFields";

/**
 * Saved supplement products with per-product dose logging. A product stores
 * its composition per a serving basis (e.g. エビオス錠「10錠あたり」); logging
 * "飲んだ数" scales the amounts and writes a normal supplement record for the
 * day (handled by the parent via onLog). Presentational — no fetching here.
 */
export function SupplementProductList({
  products,
  doseText,
  onDoseChange,
  onLog,
  onEdit,
  onDelete,
}: {
  products: readonly SupplementProduct[];
  doseText: Record<string, string>;
  onDoseChange: (productId: string, value: string) => void;
  onLog: (product: SupplementProduct) => void;
  onEdit: (product: SupplementProduct) => void;
  onDelete: (productId: string) => void;
}) {
  if (products.length === 0) {
    return (
      <p style={styles.note}>
        エビオス錠のように繰り返し飲む製品は、成分を1回登録すると次から錠数だけで記録できます。
      </p>
    );
  }
  return (
    <>
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
                onChange={(e) => onDoseChange(product.product_id, e.target.value)}
                aria-label={`${product.name}を飲んだ${product.serving_unit}数`}
                style={styles.doseInput}
              />
              <span style={styles.doseUnit}>{product.serving_unit}</span>
              <button
                type="button"
                onClick={() => onLog(product)}
                style={styles.logButton}
              >
                記録
              </button>
              <button
                type="button"
                onClick={() => onEdit(product)}
                style={styles.editProduct}
                aria-label={`${product.name}を編集`}
              >
                編集
              </button>
              <button
                type="button"
                onClick={() => onDelete(product.product_id)}
                style={styles.deleteProduct}
                aria-label={`${product.name}を削除`}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

const styles = {
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
    borderRadius: "var(--radius-sm)",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "16px",
  },
  doseUnit: { fontSize: "13px", color: "var(--color-subtext)" },
  logButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 16px",
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-primary)",
    color: "var(--color-base)",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  editProduct: {
    minHeight: "var(--tap-target-min)",
    padding: "0 10px",
    border: "none",
    background: "transparent",
    color: "var(--color-primary)",
    fontSize: "13px",
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
} satisfies Record<string, React.CSSProperties>;
