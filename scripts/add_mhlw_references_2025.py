#!/usr/bin/env python3
"""
Append the DRI 2025 reference rows for the 6 newly seeded nutrients.

Source (public, official) — 「日本人の食事摂取基準（2025年版）」策定検討会報告書
分割版PDF（正誤表 令和7年3月25日 反映済みのHP掲載版）:
  ミネラル（多量）  https://www.mhlw.go.jp/content/10904750/001316468.pdf  p.284 マグネシウム
  ミネラル（微量）  https://www.mhlw.go.jp/content/10904750/001316469.pdf  p.347 銅
  ビタミン（脂溶性）https://www.mhlw.go.jp/content/10904750/001316466.pdf  p.183 ビタミンE
  ビタミン（水溶性）https://www.mhlw.go.jp/content/10904750/001316467.pdf  p.236 ナイアシン
                                                                          p.237 ビタミンB6
                                                                          p.238 ビタミンB12
  正誤表            https://www.mhlw.go.jp/content/10904750/001316480.pdf

Values below are transcribed verbatim from those tables (成人の行のみ). They are
never recalculated, interpolated, or unit-converted (AGENTS.md).

Two upper limits are deliberately NOT stored as plain numbers, because the
official value is not comparable to a food-based intake:
  - マグネシウム UL: the table shows "−" for ordinary food; the footnote sets
    350 mg/日 only for 通常の食品以外からの摂取. Stored as "not_established"
    with the footnote in reviewer_note (same treatment as the iron UL).
  - ナイアシン UL: the cell holds two values on different bases
    (ニコチンアミド mg/日、（ ）内 ニコチン酸 mg/日) and neither is mgNE.
    Stored verbatim as a conditional string, so the judgment layer reports
    unknown(conditional_value) instead of comparing NE intake against it
    (same treatment as the iron 月経 split).
"""
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FROZEN = REPO / "seed" / "frozen"

BANDS = ["adult_18_29", "adult_30_49", "adult_50_64", "adult_65_74", "adult_75_plus"]

POLICY = {
    "estimated_average_requirement": "reference_only",
    "recommended_dietary_allowance": "low_tendency",
    "adequate_intake": "cautious_low_tendency",
    "tolerable_upper_intake_level": "high_caution",
}

MG_UL_NOTE = (
    "通常の食品からの摂取では耐容上限量を設定しない。"
    "通常の食品以外からの摂取量の耐容上限量は成人 350 mg/日"
    "（報告書 p.284 表脚注1）。"
)
NIACIN_UL_NOTE = (
    "耐容上限量はニコチンアミドの重量(mg/日)、（ ）内はニコチン酸の重量(mg/日)"
    "（報告書 p.236 表脚注3）。摂取側の mgNE とは基準が異なるため比較しない。"
)
NIACIN_UNIT_NOTE = (
    "ナイアシン当量(NE)=ナイアシン+1/60トリプトファン。"
    "摂取側は八訂 本表の NE 列を用いる（報告書 p.236 表脚注1）。"
)
VITE_NOTE = (
    "α-トコフェロールについて算定した値。摂取側は八訂 本表の TOCPHA 列を用いる"
    "（報告書 p.183 表脚注1）。"
)
B6_UL_NOTE = "耐容上限量はピリドキシン相当量として示された値（報告書 p.237 表脚注2）。"
B12_NOTE = "シアノコバラミン相当量として示された値（報告書 p.238 表脚注1）。"

# nutrient_code, 表示名, unit, source_section, {reference_type: {sex: [5 bands]}}
NUTRIENTS = [
    {
        "code": "magnesium_mg",
        "name": "マグネシウム",
        "unit": "mg",
        "section": "MHLW DRI 2025 macro-mineral PDF p.284: magnesium table",
        "values": {
            "estimated_average_requirement": {
                "male": [280, 320, 310, 290, 270],
                "female": [230, 240, 240, 240, 220],
            },
            "recommended_dietary_allowance": {
                "male": [340, 380, 370, 350, 330],
                "female": [280, 290, 290, 280, 270],
            },
            "tolerable_upper_intake_level": {
                "male": ["not_established"] * 5,
                "female": ["not_established"] * 5,
            },
        },
        "notes": {"tolerable_upper_intake_level": MG_UL_NOTE},
    },
    {
        "code": "copper_mg",
        "name": "銅",
        "unit": "mg",
        "section": "MHLW DRI 2025 trace-mineral PDF p.347: copper table",
        "values": {
            "estimated_average_requirement": {
                "male": [0.7, 0.8, 0.7, 0.7, 0.7],
                "female": [0.6, 0.6, 0.6, 0.6, 0.6],
            },
            "recommended_dietary_allowance": {
                "male": [0.8, 0.9, 0.9, 0.8, 0.8],
                "female": [0.7, 0.7, 0.7, 0.7, 0.7],
            },
            "tolerable_upper_intake_level": {
                "male": [7, 7, 7, 7, 7],
                "female": [7, 7, 7, 7, 7],
            },
        },
        "notes": {},
    },
    {
        "code": "vitamin_e_mg",
        "name": "ビタミンE",
        "unit": "mg",
        "section": "MHLW DRI 2025 fat-soluble vitamin PDF p.183: vitamin E table",
        "values": {
            "adequate_intake": {
                "male": [6.5, 6.5, 6.5, 7.5, 7.0],
                "female": [5.0, 6.0, 6.0, 7.0, 6.0],
            },
            "tolerable_upper_intake_level": {
                "male": [800, 800, 800, 800, 800],
                "female": [650, 700, 700, 700, 650],
            },
        },
        "notes": {"adequate_intake": VITE_NOTE, "tolerable_upper_intake_level": VITE_NOTE},
    },
    {
        "code": "niacin_mgne",
        "name": "ナイアシン",
        "unit": "mgNE",
        "section": "MHLW DRI 2025 water-soluble vitamin PDF p.236: niacin table",
        "values": {
            "estimated_average_requirement": {
                "male": [13, 13, 13, 11, 11],
                "female": [9, 10, 9, 9, 8],
            },
            "recommended_dietary_allowance": {
                "male": [15, 16, 15, 14, 13],
                "female": [11, 12, 11, 11, 10],
            },
            "tolerable_upper_intake_level": {
                "male": [
                    "300 nicotinamide / 80 nicotinic_acid",
                    "350 nicotinamide / 85 nicotinic_acid",
                    "350 nicotinamide / 85 nicotinic_acid",
                    "300 nicotinamide / 80 nicotinic_acid",
                    "300 nicotinamide / 75 nicotinic_acid",
                ],
                "female": [
                    "250 nicotinamide / 65 nicotinic_acid",
                    "250 nicotinamide / 65 nicotinic_acid",
                    "250 nicotinamide / 65 nicotinic_acid",
                    "250 nicotinamide / 65 nicotinic_acid",
                    "250 nicotinamide / 60 nicotinic_acid",
                ],
            },
        },
        "notes": {
            "estimated_average_requirement": NIACIN_UNIT_NOTE,
            "recommended_dietary_allowance": NIACIN_UNIT_NOTE,
            "tolerable_upper_intake_level": NIACIN_UL_NOTE,
        },
    },
    {
        "code": "vitamin_b6_mg",
        "name": "ビタミンB6",
        "unit": "mg",
        "section": "MHLW DRI 2025 water-soluble vitamin PDF p.237: vitamin B6 table",
        "values": {
            "estimated_average_requirement": {
                "male": [1.2, 1.2, 1.2, 1.2, 1.2],
                "female": [1.0, 1.0, 1.0, 1.0, 1.0],
            },
            "recommended_dietary_allowance": {
                "male": [1.5, 1.5, 1.5, 1.4, 1.4],
                "female": [1.2, 1.2, 1.2, 1.2, 1.2],
            },
            "tolerable_upper_intake_level": {
                "male": [55, 60, 60, 55, 50],
                "female": [45, 45, 45, 45, 40],
            },
        },
        "notes": {"tolerable_upper_intake_level": B6_UL_NOTE},
    },
    {
        "code": "vitamin_b12_ug",
        "name": "ビタミンB12",
        "unit": "ug",
        "section": "MHLW DRI 2025 water-soluble vitamin PDF p.238: vitamin B12 table",
        "values": {
            "adequate_intake": {
                "male": [4.0, 4.0, 4.0, 4.0, 4.0],
                "female": [4.0, 4.0, 4.0, 4.0, 4.0],
            },
        },
        "notes": {"adequate_intake": B12_NOTE},
    },
]


def main():
    path = FROZEN / "nutrient-reference.json"
    rows = json.loads(path.read_text())
    existing_ids = {r["nutrient_reference_id"] for r in rows}
    existing_codes = {r["nutrient_code"] for r in rows}

    added = 0
    for nutrient in NUTRIENTS:
        if nutrient["code"] in existing_codes:
            raise SystemExit(f'already present: {nutrient["code"]}')
        for reference_type, by_sex in nutrient["values"].items():
            for sex, values in by_sex.items():
                for band, value in zip(BANDS, values):
                    row_id = f'nr_{nutrient["code"]}_{band}_{sex}_{reference_type}'
                    if row_id in existing_ids:
                        raise SystemExit(f"duplicate id: {row_id}")
                    rows.append({
                        "nutrient_reference_id": row_id,
                        "nutrient_code": nutrient["code"],
                        "nutrient_name": nutrient["name"],
                        "reference_type": reference_type,
                        "value": value,
                        "unit": nutrient["unit"],
                        "age_band": band,
                        "sex": sex,
                        "activity_level": "not_applicable",
                        "target_population": "general_adult",
                        "judgment_policy": POLICY[reference_type],
                        "source_report": "MHLW_DRI_2025",
                        "source_section": nutrient["section"],
                        "source_checked_at": "2026-07-24",
                        "correction_reflected": "true",
                        "review_status": "value_extracted_official_mhlw_2025",
                        "reviewer_note": nutrient["notes"].get(reference_type),
                    })
                    added += 1

    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")
    print(f"added {added} reference rows; total {len(rows)}")


if __name__ == "__main__":
    main()
