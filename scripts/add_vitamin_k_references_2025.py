#!/usr/bin/env python3
"""
Append the DRI 2025 reference rows for vitamin K (目安量 AI, adults).

Source (public, official) — 「日本人の食事摂取基準（2025年版）」策定検討会報告書
分割版PDF（正誤表 令和7年3月25日 反映済みのHP掲載版）:
  ビタミン（脂溶性）https://www.mhlw.go.jp/content/10904750/001316466.pdf  p.184 ビタミンK

Vitamin K has an 目安量 (AI) only — no EAR/RDA and no 耐容上限量 (UL). All adult
bands are 150 μg/日 for both sexes. Values are transcribed verbatim and never
recalculated (AGENTS.md).

Usage: python3 scripts/add_vitamin_k_references_2025.py
"""
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FROZEN = REPO / "seed" / "frozen"

BANDS = ["adult_18_29", "adult_30_49", "adult_50_64", "adult_65_74", "adult_75_plus"]

# adequate_intake, μg/日, all adult bands 150 for both sexes (報告書 p.184)
AI_VALUES = {sex: [150, 150, 150, 150, 150] for sex in ("male", "female")}
SECTION = "MHLW DRI 2025 fat-soluble vitamin PDF p.184: vitamin K table"


def main():
    path = FROZEN / "nutrient-reference.json"
    rows = json.loads(path.read_text())
    if any(r["nutrient_code"] == "vitamin_k_ug" for r in rows):
        raise SystemExit("already present: vitamin_k_ug")
    existing_ids = {r["nutrient_reference_id"] for r in rows}

    added = 0
    for sex, values in AI_VALUES.items():
        for band, value in zip(BANDS, values):
            row_id = f"nr_vitamin_k_ug_{band}_{sex}_adequate_intake"
            if row_id in existing_ids:
                raise SystemExit(f"duplicate id: {row_id}")
            rows.append({
                "nutrient_reference_id": row_id,
                "nutrient_code": "vitamin_k_ug",
                "nutrient_name": "ビタミンK",
                "reference_type": "adequate_intake",
                "value": value,
                "unit": "ug",
                "age_band": band,
                "sex": sex,
                "activity_level": "not_applicable",
                "target_population": "general_adult",
                "judgment_policy": "cautious_low_tendency",
                "source_report": "MHLW_DRI_2025",
                "source_section": SECTION,
                "source_checked_at": "2026-07-24",
                "correction_reflected": "true",
                "review_status": "value_extracted_official_mhlw_2025",
                "reviewer_note": None,
            })
            added += 1

    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")
    print(f"added {added} reference rows; total {len(rows)}")


if __name__ == "__main__":
    main()
