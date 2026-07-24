#!/usr/bin/env python3
"""
Build the frozen seed (food-master + compact nutrient-amount) for ALL foods
in the official MEXT food composition table (八訂 増補2023, 第2章 本表).

Source (public, official):
  https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_02.xlsx
  sheet "表全体", 2,538 foods, per-100g edible portion.

Rules (must match the existing 40-food seed conventions exactly):
  - plain number      -> value_status "official_value",             amount = number
  - "(x)" (x numeric) -> value_status "parenthesized_official_value" amount = x   ("(0)" -> 0)
  - "Tr" / "(Tr)"     -> value_status "trace",                      amount = 0
  - "-" (not measured)-> value_status "not_measured",               amount = null
  - trailing footnote marks (e.g. "14.0†") are stripped to the number

The existing 40 foods are preserved verbatim (their curated food_id /
display_name / official_food_name / approved_state are kept); only the
remaining ~2,498 foods are generated from the Excel. Official values are
copied as-is and never recalculated (AGENTS.md).

Output is COMPACT: nutrient-amount rows are [food_id, nutrient_code, amount,
value_status] tuples; loadSeed rehydrates them to full records using constant
provenance + a nutrient dictionary. This keeps the bundle small (~2MB vs ~25MB).
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

REPO = Path(__file__).resolve().parent.parent
FROZEN = REPO / "seed" / "frozen"

# app nutrient code -> official 成分識別子 (八訂 identifier)
NUTRIENT_ID = {
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
NUTRIENT_ORDER = list(NUTRIENT_ID.keys())


def parse_value(raw):
    """Return (amount, value_status) following the seed conventions."""
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
    body = body.rstrip("†*").strip()  # strip footnote marks
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
    col = {k: ids[v] for k, v in NUTRIENT_ID.items()}
    data = [r for r in rows if re.fullmatch(r"\d{5}", str(r[1]).strip() if r[1] is not None else "")]
    return data, col


def main():
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "seed" / "source" / "mext_ch2_honpyo.xlsx"
    data, col = load_excel(xlsx)

    existing_fm = json.loads((FROZEN / "food-master.json").read_text())
    existing_na = json.loads((FROZEN / "nutrient-amount.json").read_text())
    by_code = {f["official_food_code"]: f for f in existing_fm}

    food_master = list(existing_fm)
    # compact nutrient tuples; keep existing 640 first (as tuples) for verify
    nutrient = [
        [r["food_id"], r["nutrient_code"], r["amount_per_100g"], r["value_status"]]
        for r in existing_na
    ]

    for r in data:
        code = str(r[1]).strip()
        if code in by_code:
            continue  # existing 40 preserved verbatim
        name = re.sub(r"\s+", " ", str(r[3]).strip())
        food_id = f"food_{code}"
        food_master.append({
            "food_id": food_id,
            "display_name": name,
            "official_food_code": code,
            "official_food_name": name,
            "approved_state": "unclassified",
            "source_status": "MEXT_public_doc",
            "review_status": "bulk_extracted_official_mext",
        })
        for ncode in NUTRIENT_ORDER:
            amount, status = parse_value(r[col[ncode]])
            nutrient.append([food_id, ncode, amount, status])

    (FROZEN / "food-master.json").write_text(
        json.dumps(food_master, ensure_ascii=False, indent=1) + "\n"
    )
    (FROZEN / "nutrient-amount.json").write_text(
        json.dumps(nutrient, ensure_ascii=False) + "\n"
    )
    print(f"foods: {len(food_master)}  nutrient rows: {len(nutrient)}")


if __name__ == "__main__":
    main()
