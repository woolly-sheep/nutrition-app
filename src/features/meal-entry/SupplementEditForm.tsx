"use client";

import { useState } from "react";
import type { SupplementRecord } from "../../server/api/schemas/supplements";
import {
  SupplementAmountFields,
  computeAmounts,
  rowsFromRecord,
  type Draft,
} from "./SupplementAmountFields";

/**
 * Inline edit of one saved supplement record (issue #31). Same fields and
 * rules as recording; the record keeps its day and identity — only the
 * product name and amounts change. Mirrors the meal inline-edit pattern:
 * no modal, 保存/やめる, and editing to zero amounts is blocked.
 */
export function SupplementEditForm({
  record,
  onCancel,
  onSaved,
}: {
  record: SupplementRecord;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [productName, setProductName] = useState(record.product_name);
  const [rows, setRows] = useState<Draft[]>(rowsFromRecord(record));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle",
  );

  const { validAmounts, hasDuplicate } = computeAmounts(rows);
  const canSave =
    productName.trim() !== "" &&
    validAmounts.length > 0 &&
    !hasDuplicate &&
    saveState !== "saving";

  const handleUpdate = async () => {
    if (!canSave) {
      return;
    }
    setSaveState("saving");
    try {
      const response = await fetch(`/api/supplements/${record.supplement_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: record.date,
          product_name: productName.trim(),
          amounts: validAmounts,
        }),
      });
      if (!response.ok) {
        setSaveState("error");
        return;
      }
      onSaved();
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div style={styles.editCard}>
      <p style={styles.formHeading}>サプリの記録を編集</p>

      <SupplementAmountFields
        nameId="supplement-edit-name"
        productName={productName}
        setProductName={setProductName}
        rows={rows}
        setRows={setRows}
        hasDuplicate={hasDuplicate}
      />

      <div style={styles.editActions}>
        <button type="button" onClick={onCancel} style={styles.cancelButton}>
          やめる
        </button>
        <button
          type="button"
          onClick={() => void handleUpdate()}
          disabled={!canSave}
          style={{
            ...styles.saveButton,
            marginTop: 0,
            width: "auto",
            flex: "1 1 auto",
            opacity: canSave ? 1 : 0.5,
          }}
        >
          保存
        </button>
      </div>
      {saveState === "error" && (
        <p role="status" style={styles.note}>
          保存できませんでした。もう一度お試しください。
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
  editCard: {
    border: "1px solid var(--color-primary)",
    borderRadius: "var(--radius-md)",
    padding: "14px",
    marginTop: "8px",
  },
  editActions: {
    display: "flex",
    gap: "10px",
    marginTop: "14px",
  },
  cancelButton: {
    minHeight: "var(--tap-target-min)",
    padding: "0 16px",
    border: "1px solid var(--color-primary)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },
  saveButton: {
    display: "block",
    width: "100%",
    minHeight: "var(--tap-target-min)",
    marginTop: "14px",
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-primary)",
    color: "var(--color-base)",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
} satisfies Record<string, React.CSSProperties>;
