"use client";

import {
  SUPPLEMENT_NUTRIENTS,
  type SupplementRecord,
} from "../../server/api/schemas/supplements";

/**
 * Shared supplement-entry fields (製品名 + 栄養素の表示値の行編集), used
 * identically by both recording (ViewMode) and inline edit (EditMode) in
 * SupplementPanel. Self-reported: the user types the amounts from the
 * product label. Amounts and the duplicate rule live in helpers below so
 * both call sites derive canSave the same way.
 */

export type Draft = { nutrientCode: string; amountText: string };

export const NUTRIENT_BY_CODE = new Map(
  SUPPLEMENT_NUTRIENTS.map((n) => [n.code, n]),
);

/** Positive, finite amounts only, plus whether a nutrient is entered twice. */
export function computeAmounts(rows: readonly Draft[]): {
  validAmounts: { nutrient_code: string; amount: number }[];
  hasDuplicate: boolean;
} {
  const validAmounts = rows
    .map((row) => ({
      nutrient_code: row.nutrientCode,
      amount: Number(row.amountText),
    }))
    .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
  const hasDuplicate =
    new Set(validAmounts.map((a) => a.nutrient_code)).size !==
    validAmounts.length;
  return { validAmounts, hasDuplicate };
}

export function updateRow(
  setRows: React.Dispatch<React.SetStateAction<Draft[]>>,
  index: number,
  patch: Partial<Draft>,
) {
  setRows((rows) =>
    rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
  );
}

/** First nutrient not already chosen, so adding a row is useful by default. */
export function nextNutrient(rows: readonly Draft[]): string {
  const used = new Set(rows.map((r) => r.nutrientCode));
  return (
    SUPPLEMENT_NUTRIENTS.find((n) => !used.has(n.code))?.code ??
    SUPPLEMENT_NUTRIENTS[0].code
  );
}

export function emptyRows(): Draft[] {
  return [{ nutrientCode: SUPPLEMENT_NUTRIENTS[0].code, amountText: "" }];
}

export function rowsFromRecord(record: SupplementRecord): Draft[] {
  return record.amounts.map((a) => ({
    nutrientCode: a.nutrient_code,
    amountText: String(a.amount),
  }));
}

export function SupplementAmountFields({
  nameId,
  productName,
  setProductName,
  placeholder,
  rows,
  setRows,
  hasDuplicate,
}: {
  nameId: string;
  productName: string;
  setProductName: (value: string) => void;
  placeholder?: string;
  rows: Draft[];
  setRows: React.Dispatch<React.SetStateAction<Draft[]>>;
  hasDuplicate: boolean;
}) {
  return (
    <>
      <label style={styles.label} htmlFor={nameId}>
        製品名
      </label>
      <input
        id={nameId}
        type="text"
        value={productName}
        onChange={(event) => setProductName(event.target.value)}
        placeholder={placeholder}
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
          setRows([...rows, { nutrientCode: nextNutrient(rows), amountText: "" }])
        }
        style={styles.addRow}
      >
        ＋ 栄養素を追加
      </button>

      {hasDuplicate && (
        <p style={styles.note}>同じ栄養素が重複しています。まとめてください。</p>
      )}
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
} satisfies Record<string, React.CSSProperties>;
