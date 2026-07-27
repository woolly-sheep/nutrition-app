"use client";

import { useCallback, useEffect, useState } from "react";
import { formatAmount } from "../../components/RemainingCard";
import type { SupplementProduct } from "../../server/api/schemas/supplementProducts";
import { SupplementProductList } from "./SupplementProductList";
import { SupplementProductForm } from "./SupplementProductForm";

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
  /**
   * Bumped by the parent when a product was registered elsewhere (e.g. from
   * the free-form entry's「製品として登録」), so this list reloads to show it.
   */
  refreshSignal?: number;
};

export function SupplementProductManager({
  date,
  onLogged,
  refreshSignal,
}: Props) {
  const [products, setProducts] = useState<readonly SupplementProduct[]>([]);
  const [doseText, setDoseText] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SupplementProduct | null>(null);

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
  }, [load, refreshSignal]);

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

  // Editing takes over the whole panel so the prefilled form is unmissable.
  if (editing !== null) {
    return (
      <div style={styles.wrap}>
        <p style={styles.heading}>登録した製品</p>
        <SupplementProductForm
          product={editing}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <p style={styles.heading}>登録した製品（飲んだ数で記録）</p>

      <SupplementProductList
        products={products}
        doseText={doseText}
        onDoseChange={(productId, value) =>
          setDoseText((prev) => ({ ...prev, [productId]: value }))
        }
        onLog={(product) => void handleLog(product)}
        onEdit={(product) => setEditing(product)}
        onDelete={(id) => void handleDeleteProduct(id)}
      />

      {/* #62: registering a new product is the occasional task — keep it out of
          the main dose-logging flow behind a 折りたたみ. */}
      <details style={styles.manage}>
        <summary style={styles.manageSummary}>製品を管理</summary>
        <div style={{ marginTop: "8px" }}>
          {creating ? (
            <SupplementProductForm
              onSaved={() => {
                setCreating(false);
                void load();
              }}
              onCancel={() => setCreating(false)}
            />
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
      </details>
    </div>
  );
}

const styles = {
  wrap: {
    border: "1px solid var(--color-surface)",
    borderRadius: "var(--radius-md)",
    padding: "12px",
    marginBottom: "16px",
  },
  heading: { fontSize: "14px", fontWeight: 700, margin: "0 0 8px" },
  manage: { marginTop: "12px", borderTop: "1px solid var(--color-surface)", paddingTop: "8px" },
  manageSummary: {
    minHeight: "var(--tap-target-min)",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--color-primary)",
  },
  addProduct: {
    minHeight: "var(--tap-target-min)",
    marginTop: "10px",
    padding: "0 14px",
    border: "1px dashed var(--color-primary)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "13px",
    cursor: "pointer",
  },
} satisfies Record<string, React.CSSProperties>;
