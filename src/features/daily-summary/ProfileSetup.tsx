"use client";

import { useState } from "react";
import type { AgeBand, Sex } from "../../domain/reference/types";

/**
 * Onboarding (UI design v0.4 §2): what the app does, the mandatory
 * first-use disclaimer (policy §5), the DRI 2025 demographic selection,
 * and a consent-labelled CTA. Saving the profile is the consent action
 * in the MVP (consented_at persistence comes with auth). No user name
 * anywhere — nameless wording is the formal decision until auth (§3).
 */

const AGE_BAND_LABELS: Record<AgeBand, string> = {
  adult_18_29: "18〜29歳",
  adult_30_49: "30〜49歳",
  adult_50_64: "50〜64歳",
  adult_65_74: "65〜74歳",
  adult_75_plus: "75歳以上",
};

const SEX_LABELS: Record<Sex, string> = {
  male: "男性",
  female: "女性",
};

type Props = {
  disclaimer: string;
  onSaved: () => void;
};

export function ProfileSetup({ disclaimer, onSaved }: Props) {
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSave = ageBand !== null && sex !== null && !saving;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setFailed(false);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageBand, sex }),
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      onSaved();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: "20px", margin: "0 0 8px" }}>はじめに</h1>

      <section
        style={{
          padding: "12px 16px",
          borderRadius: "10px",
          background: "var(--color-surface)",
        }}
      >
        <h2 style={{ fontSize: "14px", margin: "0 0 8px" }}>
          このアプリができること
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: "18px",
            fontSize: "13px",
            lineHeight: 1.8,
          }}
        >
          <li>日本食品標準成分表(八訂)で栄養価を自動計算</li>
          <li>食事摂取基準(2025)のあなたの区分と比較</li>
          <li>不足量を食品の量に換算して表示</li>
        </ul>
      </section>

      <section style={{ marginTop: "16px" }}>
        <h2 style={{ fontSize: "14px", margin: "0 0 4px" }}>注意事項</h2>
        <p
          style={{
            color: "var(--color-subtext)",
            fontSize: "12px",
            lineHeight: 1.8,
            margin: 0,
          }}
        >
          {disclaimer}
        </p>
      </section>

      <h2 style={{ fontSize: "16px", margin: "20px 0 4px" }}>
        比較する基準の区分を選んでください
      </h2>
      <p style={{ color: "var(--color-subtext)", fontSize: "13px", margin: 0 }}>
        食事摂取基準(2025)は年齢・性別ごとに基準値が異なります。
        選んだ区分との比較のみを行い、この設定は端末内にのみ保存されます。
      </p>

      <fieldset style={styles.fieldset}>
        <legend style={styles.legend}>年齢</legend>
        <div style={styles.optionRow}>
          {(Object.keys(AGE_BAND_LABELS) as AgeBand[]).map((band) => (
            <button
              key={band}
              type="button"
              onClick={() => setAgeBand(band)}
              aria-pressed={ageBand === band}
              style={optionStyle(ageBand === band)}
            >
              {AGE_BAND_LABELS[band]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset style={styles.fieldset}>
        <legend style={styles.legend}>性別（食事摂取基準の区分）</legend>
        <div style={styles.optionRow}>
          {(Object.keys(SEX_LABELS) as Sex[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSex(value)}
              aria-pressed={sex === value}
              style={optionStyle(sex === value)}
            >
              {SEX_LABELS[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        style={{
          width: "100%",
          minHeight: "var(--tap-target-min)",
          marginTop: "8px",
          border: "none",
          borderRadius: "8px",
          background: "var(--color-primary)",
          color: "var(--color-base)",
          fontSize: "16px",
          fontWeight: 700,
          cursor: "pointer",
          opacity: canSave ? 1 : 0.5,
        }}
      >
        注意事項に同意して始める
      </button>
      {failed && (
        <p role="status" style={{ color: "var(--color-subtext)", fontSize: "13px" }}>
          保存できませんでした。もう一度お試しください。
        </p>
      )}
    </div>
  );
}

function optionStyle(selected: boolean): React.CSSProperties {
  return {
    minHeight: "var(--tap-target-min)",
    padding: "0 14px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: selected ? "var(--color-primary)" : "var(--color-base)",
    color: selected ? "var(--color-base)" : "var(--color-text)",
    fontSize: "14px",
    cursor: "pointer",
  };
}

const styles = {
  fieldset: {
    border: "none",
    margin: "16px 0 0",
    padding: 0,
  },
  legend: {
    fontSize: "14px",
    fontWeight: 700,
    padding: 0,
    marginBottom: "8px",
  },
  optionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
} satisfies Record<string, React.CSSProperties>;

export { AGE_BAND_LABELS, SEX_LABELS };
