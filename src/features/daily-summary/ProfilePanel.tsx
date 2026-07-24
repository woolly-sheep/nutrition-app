"use client";

import { useEffect, useState } from "react";
import { resolveAgeBand } from "../../domain/reference/ageBand";
import type { AgeBand, Sex } from "../../domain/reference/types";
import { AGE_BAND_LABELS, SEX_LABELS } from "./ProfileSetup";

/**
 * Editing the saved demographic after onboarding (設定). Same fields as
 * ProfileSetup; the age band stays derived from the birth date, so the
 * comparison follows the user's age without any further action.
 */

const TODAY = new Date().toISOString().slice(0, 10);

type StoredShape = {
  sex: Sex;
  birthDate?: string;
  ageBand?: AgeBand;
};

export function ProfilePanel() {
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [legacyBand, setLegacyBand] = useState<AgeBand | null>(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as { profile: StoredShape | null };
        if (!active || body.profile === null) {
          return;
        }
        setSex(body.profile.sex);
        setBirthDate(body.profile.birthDate ?? "");
        setLegacyBand(
          body.profile.birthDate ? null : (body.profile.ageBand ?? null),
        );
      } catch {
        // Panel stays empty; the daily summary shows the saved values.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const resolution =
    birthDate !== "" && birthDate <= TODAY
      ? resolveAgeBand(birthDate, TODAY)
      : null;
  const canSave = resolution?.ok === true && sex !== null && !saving;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setFailed(false);
    setSaved(false);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, sex }),
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      setLegacyBand(null);
      setSaved(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p style={styles.note}>
        食事摂取基準(2025)は年齢・性別ごとに基準値が異なります。
        生年月日から区分を判定し、誕生日を過ぎると比較先も自動で切り替わります。
      </p>

      <label style={styles.label} htmlFor="profile-birth-date">
        生年月日
      </label>
      <input
        id="profile-birth-date"
        type="date"
        value={birthDate}
        max={TODAY}
        onChange={(event) => {
          setBirthDate(event.target.value);
          setSaved(false);
        }}
        style={styles.dateInput}
      />

      <fieldset style={styles.fieldset}>
        <legend style={styles.label}>性別（食事摂取基準の区分）</legend>
        <div style={{ display: "flex", gap: "8px" }}>
          {(Object.keys(SEX_LABELS) as Sex[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSex(value);
                setSaved(false);
              }}
              aria-pressed={sex === value}
              style={optionStyle(sex === value)}
            >
              {SEX_LABELS[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <p style={styles.note}>
        {resolution?.ok === true
          ? `現在 ${resolution.age}歳 · 区分「${AGE_BAND_LABELS[resolution.ageBand]}」で比較します`
          : resolution?.ok === false
            ? "18歳未満の基準値は収録していないため比較できません。"
            : legacyBand
              ? `現在の設定: ${AGE_BAND_LABELS[legacyBand]}（生年月日を入れると自動判定に切り替わります）`
              : "生年月日を入れると、比較する区分が決まります。"}
      </p>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        style={{ ...styles.saveButton, opacity: canSave ? 1 : 0.5 }}
      >
        設定を保存
      </button>
      {saved && (
        <p role="status" style={styles.note}>
          保存しました。
        </p>
      )}
      {failed && (
        <p role="status" style={styles.note}>
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
    margin: "12px 0 6px",
    padding: 0,
  },
  fieldset: { border: "none", margin: "4px 0 0", padding: 0 },
  dateInput: {
    minHeight: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "16px",
  },
  saveButton: {
    minHeight: "var(--tap-target-min)",
    marginTop: "12px",
    padding: "0 18px",
    border: "none",
    borderRadius: "8px",
    background: "var(--color-primary)",
    color: "var(--color-base)",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
} satisfies Record<string, React.CSSProperties>;
