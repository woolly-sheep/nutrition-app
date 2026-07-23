"use client";

import { useRef, useState } from "react";

/**
 * データのバックアップ — export all records + profile to a JSON file, or
 * restore from one. Restore fully replaces the current records, so it asks
 * for an explicit confirmation first. Fails safe: an invalid file changes
 * nothing (the server validates the whole payload before writing).
 */
export function BackupPanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    setStatus(null);
    try {
      const response = await fetch("/api/backup");
      if (!response.ok) {
        setStatus("エクスポートに失敗しました。");
        return;
      }
      const text = await response.text();
      const url = URL.createObjectURL(
        new Blob([text], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nutrition-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("エクスポートしました。");
    } catch {
      setStatus("エクスポートに失敗しました。");
    }
  };

  const handleFile = async (file: File) => {
    setStatus(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus("ファイルを読み込めませんでした。");
      return;
    }
    if (
      !window.confirm(
        "現在の記録をすべて置き換えます。取り消せません。復元しますか？",
      )
    ) {
      return;
    }
    try {
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      if (response.ok) {
        const data = (await response.json()) as { restored: number };
        setStatus(`復元しました（${data.restored}件）。画面を再読み込みしてください。`);
      } else {
        setStatus("復元できませんでした。ファイルの内容を確認してください。");
      }
    } catch {
      setStatus("復元できませんでした。");
    }
  };

  return (
    <div>
      <p style={styles.help}>
        記録と区分設定をJSONファイルに保存・復元できます。復元は現在の記録を置き換えます。
      </p>
      <div style={styles.row}>
        <button type="button" onClick={() => void handleExport()} style={styles.button}>
          エクスポート
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          style={styles.button}
        >
          インポート（復元）
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
            event.target.value = "";
          }}
        />
      </div>
      {status && (
        <p role="status" style={styles.status}>
          {status}
        </p>
      )}
    </div>
  );
}

const styles = {
  help: { color: "var(--color-subtext)", fontSize: "13px", margin: "0 0 10px" },
  row: { display: "flex", gap: "8px", flexWrap: "wrap" },
  button: {
    minHeight: "var(--tap-target-min)",
    padding: "0 16px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  status: { fontSize: "13px", margin: "10px 0 0" },
} satisfies Record<string, React.CSSProperties>;
