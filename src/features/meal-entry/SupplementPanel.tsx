"use client";

import { useCallback, useEffect, useState } from "react";
import { formatAmount } from "../../components/RemainingCard";
import {
  SUPPLEMENT_NUTRIENTS,
  type SupplementRecord,
} from "../../server/api/schemas/supplements";

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

type Draft = { nutrientCode: string; amountText: string };

const NUTRIENT_BY_CODE = new Map(
  SUPPLEMENT_NUTRIENTS.map((n) => [n.code, n]),
);

export function SupplementPanel({ date }: Props) {
  const [saved, setSaved] = useState<readonly SupplementRecord[]>([]);
  const [productName, setProductName] = useState("");
  const [rows, setRows] = useState<Draft[]>([
    { nutrientCode: SUPPLEMENT_NUTRIENTS[0].code, amountText: "" },
  ]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle",
  );

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

  const validAmounts = rows
    .map((row) => ({ nutrient_code: row.nutrientCode, amount: Number(row.amountText) }))
    .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
  const hasDuplicate =
    new Set(validAmounts.map((a) => a.nutrient_code)).size !==
    validAmounts.length;
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
      setRows([{ nutrientCode: SUPPLEMENT_NUTRIENTS[0].code, amountText: "" }]);
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

  return (
    <div>
      <p style={styles.note}>
        サプリメントで摂った分を記録します。数値は製品の表示値を入力してください。
        食品からの摂取とは分けて集計し、分析タブで内訳を表示します。
      </p>

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
              <button
                type="button"
                onClick={() => void handleDelete(record.supplement_id)}
                style={styles.deleteButton}
                aria-label={`${record.product_name}を削除`}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <label style={styles.label} htmlFor="supplement-name">
        製品名
      </label>
      <input
        id="supplement-name"
        type="text"
        value={productName}
        onChange={(event) => setProductName(event.target.value)}
        placeholder="マルチビタミン など"
        maxLength={100}
        style={styles.textInput}
      />

      <span style={styles.label}>含まれる栄養素（表示値）</span>
      {rows.map((row, index) => (
        <div key={index} style={styles.amountRow}>
          <select
            value={row.nutrientCode}
            onChange={(event) =>
              updateRow(setRows, index, { nutrientCode: event.target.value })
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
            onChange={(event) =>
              updateRow(setRows, index, { amountText: event.target.value })
            }
            aria-label={`${NUTRIENT_BY_CODE.get(row.nutrientCode)?.name ?? ""}の量`}
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
        <p style={styles.note}>同じ栄養素が重複しています。まとめてください。</p>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
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

function updateRow(
  setRows: React.Dispatch<React.SetStateAction<Draft[]>>,
  index: number,
  patch: Partial<Draft>,
) {
  setRows((rows) =>
    rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
  );
}

/** First nutrient not already chosen, so adding a row is useful by default. */
function nextNutrient(rows: readonly Draft[]): string {
  const used = new Set(rows.map((r) => r.nutrientCode));
  return (
    SUPPLEMENT_NUTRIENTS.find((n) => !used.has(n.code))?.code ??
    SUPPLEMENT_NUTRIENTS[0].code
  );
}

const styles = {
  note: {
    color: "var(--color-subtext)",
    fontSize: "12px",
    lineHeight: 1.7,
    margin: "8px 0 0",
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
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    margin: "14px 0 6px",
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
  amountRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginBottom: "8px",
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
    padding: "0 14px",
    border: "1px dashed var(--color-primary)",
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
