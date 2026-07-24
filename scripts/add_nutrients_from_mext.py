#!/usr/bin/env python3
"""
Append 6 nutrients to the frozen nutrient-amount seed, from the same official
MEXT source already used for the existing 16 (八訂 増補2023, 第2章 本表).

Added (app code -> 成分識別子):
  magnesium_mg   MG        マグネシウム
  copper_mg      CU        銅
  vitamin_e_mg   TOCPHA    ビタミンE（α-トコフェロール。DRI と同じ基準）
  niacin_mgne    NE        ナイアシン当量（DRI の単位 mgNE/日 と同じ基準）
  vitamin_b6_mg  VITB6A    ビタミンB6
  vitamin_b12_ug VITB12    ビタミンB12

Existing rows are never touched: the script appends only, and first re-reads
the 16 existing nutrients for the curated 40 foods from the Excel to confirm
the column mapping still reproduces them exactly (fails loudly otherwise).
Official values are copied as-is and never recalculated (AGENTS.md).

Usage: python3 scripts/add_nutrients_from_mext.py [path/to/mext_ch2_honpyo.xlsx]
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

REPO = Path(__file__).resolve().parent.parent
FROZEN = REPO / "seed" / "frozen"

EXISTING_NUTRIENT_ID = {
    "energy_kcal": "ENERC_KCAL",
    "protein_g": "PROT-",
    "fat_g": "FAT-",
    "carbohydrate_g": "CHOCDF-",
    "dietary_fiber_g": "FIB-",
    "salt_equivalent_g": "NACL_EQ",
    "potassium_mg": "K",
    "calcium_mg": "CA",
    "iron_mg": "FE",
    "zinc_mg": "ZN",
    "vitamin_a_ug": "VITA_RAE",
    "vitamin_b1_mg": "THIA",
    "vitamin_b2_mg": "RIBF",
    "vitamin_c_mg": "VITC",
    "vitamin_d_ug": "VITD",
    "folate_ug": "FOL",
}

NEW_NUTRIENT_ID = {
    "magnesium_mg": "MG",
    "copper_mg": "CU",
    "vitamin_e_mg": "TOCPHA",
    "niacin_mgne": "NE",
    "vitamin_b6_mg": "VITB6A",
    "vitamin_b12_ug": "VITB12",
}
NEW_ORDER = list(NEW_NUTRIENT_ID.keys())


def parse_value(raw):
    """Return (amount, value_status) — identical rules to build_seed_from_mext."""
    if raw is None:
        return None, "not_measured"
    if isinstance(raw, (int, float)):
        return raw, "official_value"
    s = str(raw).strip()
    if s == "" or s == "-":
        return None, "not_measured"
    if s in ("Tr", "(Tr)"):
        return 0, "trace"
    paren = s.startswith("(") and s.endswith(")")
    body = s[1:-1].strip() if paren else s
    body = body.rstrip("†*").strip()
    if body == "Tr":
        return 0, "trace"
    num = float(body)
    if num == int(num):
        num = int(num)
    return num, ("parenthesized_official_value" if paren else "official_value")


def load_excel(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["表全体"]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    idrow = next(
        i for i, r in enumerate(rows)
        if any(str(c).strip() == "ENERC_KCAL" for c in r if c is not None)
    )
    ids = {str(v).strip(): c for c, v in enumerate(rows[idrow]) if v not in (None, "")}
    col = {
        k: ids[v]
        for k, v in {**EXISTING_NUTRIENT_ID, **NEW_NUTRIENT_ID}.items()
    }
    data = [
        r for r in rows
        if re.fullmatch(r"\d{5}", str(r[1]).strip() if r[1] is not None else "")
    ]
    return data, col


def main():
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "seed" / "source" / "mext_ch2_honpyo.xlsx"
    data, col = load_excel(xlsx)
    by_code = {str(r[1]).strip(): r for r in data}

    food_master = json.loads((FROZEN / "food-master.json").read_text())
    compact = json.loads((FROZEN / "nutrient-amount.json").read_text())

    existing_keys = {(row[0], row[1]) for row in compact}
    already = {code for _, code in existing_keys}
    overlap = already & set(NEW_ORDER)
    if overlap:
        raise SystemExit(f"already present, refusing to duplicate: {sorted(overlap)}")

    # Guard: the column mapping must still reproduce the existing rows exactly.
    by_key = {(row[0], row[1]): row for row in compact}
    mismatches = []
    for food in food_master:
        excel_row = by_code.get(food["official_food_code"])
        if excel_row is None:
            continue
        for ncode in EXISTING_NUTRIENT_ID:
            stored = by_key.get((food["food_id"], ncode))
            if stored is None:
                continue
            amount, status = parse_value(excel_row[col[ncode]])
            if [stored[2], stored[3]] != [amount, status]:
                mismatches.append(
                    f'{food["food_id"]}/{ncode}: seed={stored[2]}({stored[3]}) '
                    f"excel={amount}({status})"
                )
    if mismatches:
        raise SystemExit(
            "existing rows do not match the Excel — column mapping changed?\n"
            + "\n".join(mismatches[:20])
        )
    print(f"verified {len(food_master)} foods x {len(EXISTING_NUTRIENT_ID)} existing nutrients")

    added = 0
    missing_foods = []
    for food in food_master:
        excel_row = by_code.get(food["official_food_code"])
        if excel_row is None:
            missing_foods.append(food["food_id"])
            continue
        for ncode in NEW_ORDER:
            amount, status = parse_value(excel_row[col[ncode]])
            compact.append([food["food_id"], ncode, amount, status])
            added += 1
    if missing_foods:
        raise SystemExit(f"no Excel row for: {missing_foods[:10]}")

    (FROZEN / "nutrient-amount.json").write_text(
        json.dumps(compact, ensure_ascii=False) + "\n"
    )
    print(f"added {added} rows; total {len(compact)}")


if __name__ == "__main__":
    main()
