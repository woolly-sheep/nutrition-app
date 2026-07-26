"use client";

import { useCallback, useEffect, useState } from "react";
import { formatAmount } from "../../components/RemainingCard";
import { type SupplementRecord } from "../../server/api/schemas/supplements";
import { SupplementProductManager } from "./SupplementProductManager";
import { SupplementEditForm } from "./SupplementEditForm";
import {
  SupplementAmountFields,
  NUTRIENT_BY_CODE,
  computeAmounts,
  emptyRows,
  type Draft,
} from "./SupplementAmountFields";

/**
 * サプリメント記録 (decision-20260724-supplement-intake). Self-reported: the
 * user types the amounts from the product label. Kept visually and in data
 * apart from meals; the analysis tab shows the food / supplement split. No
 * medical framing — this only records what was taken.
 */

type Props = {
  /** The record day this panel edits, shared with the meal entry above. */
  date: string;
};

export function SupplementPanel({ date }: Props) {
  const [saved, setSaved] = useState<readonly SupplementRecord[]>([]);
  const [productName, setProductName] = useState("");
  const [rows, setRows] = useState<Draft[]>(emptyRows());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle",
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/supplements?date=${date}`);
      if (response.ok) {
        const body = (await response.json()) as {
          supplements: SupplementRecord[];
        };
        setSaved(body.supplements);
      }
    } catch {
      // supplementary — meal recording still works without this
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const { validAmounts, hasDuplicate } = computeAmounts(rows);
  const canSave =
    productName.trim() !== "" &&
    validAmounts.length > 0 &&
    !hasDuplicate &&
    saveState !== "saving";

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaveState("saving");
    try {
      const response = await fetch("/api/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          product_name: productName.trim(),
          amounts: validAmounts,
        }),
      });
      if (!response.ok) {
        setSaveState("error");
        return;
      }
      setProductName("");
      setRows(emptyRows());
      setSaveState("idle");
      await load();
    } catch {
      setSaveState("error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/supplements/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await load();
      }
    } catch {
      // leave the list unchanged on failure
    }
  };

  if (editingId !== null) {
    return (
      <SupplementEditForm
        record={saved.find((r) => r.supplement_id === editingId)!}
        onCancel={() => setEditingId(null)}
        onSaved={async () => {
          setEditingId(null);
          await load();
        }}
      />
    );
  }

  return (
    <div>
      <p style={styles.note}>
        サプリメントで摂った分を記録します。数値は製品の表示値を入力してください。
        食品からの摂取とは分けて集計し、分析タブで内訳を表示します。
      </p>

      <SupplementProductManager date={date} onLogged={() => void load()} />

      <p style={styles.formHeading}>この日に記録したサプリ</p>

      {saved.length > 0 && (
        <ul style={styles.list}>
          {saved.map((record) => (
            <li key={record.supplement_id} style={styles.listItem}>
              <div>
                <span style={{ fontSize: "14px" }}>{record.product_name}</span>
                <span style={styles.itemAmounts}>
                  {record.amounts
                    .map((a) => {
                      const meta = NUTRIENT_BY_CODE.get(a.nutrient_code);
                      return `${meta?.name ?? a.nutrient_code} ${formatAmount(a.amount)}${meta?.unit ?? ""}`;
                    })
                    .join(" ・ ")}
                </span>
              </div>
              <div style={styles.itemActions}>
                <button
                  type="button"
                  onClick={() => setEditingId(record.supplement_id)}
                  style={styles.editButton}
                  aria-label={`${record.product_name}を編集`}
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(record.supplement_id)}
                  style={styles.deleteButton}
                  aria-label={`${record.product_name}を削除`}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SupplementAmountFields
        nameId="supplement-name"
        productName={productName}
        setProductName={setProductName}
        placeholder="マルチビタミン など"
        rows={rows}
        setRows={setRows}
        hasDuplicate={hasDuplicate}
      />

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        style={{ ...styles.saveButton, opacity: canSave ? 1 : 0.5 }}
      >
        サプリを記録
      </button>
      {saveState === "error" && (
        <p role="status" style={styles.note}>
          記録できませんでした。もう一度お試しください。
        </p>
      )}
    </div>
  );
}

const styles = {
  note: {
    color: "var(--color-subtext)",
    fontSize: "12px",
    lineHeight: 1.7,
    margin: "8px 0 0",
  },
  formHeading: {
    fontSize: "14px",
    fontWeight: 700,
    margin: "18px 0 0",
  },
  list: { listStyle: "none", margin: "12px 0 0", padding: 0 },
  listItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "8px 0",
    borderBottom: "1px solid var(--color-surface)",
  },
  itemAmounts: {
    display: "block",
    fontSize: "12px",
    color: "var(--color-subtext)",
    marginTop: "2px",
  },
  itemActions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  editButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "13px",
    cursor: "pointer",
  },
  deleteButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "13px",
    cursor: "pointer",
  },
  saveButton: {
    display: "block",
    width: "100%",
    minHeight: "var(--tap-target-min)",
    marginTop: "14px",
    border: "none",
    borderRadius: "8px",
    background: "var(--color-primary)",
    color: "var(--color-base)",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
} satisfies Record<string, React.CSSProperties>;
