#!/usr/bin/env python3
"""Extract frozen seed JSON from the approved seed extraction workbook.

Source of truth:
  docs/handoff/handoff_for_local_implementation_20260708/
    02_seed_extraction_workbook_v0_1_20260707.md (xlsx)

Rules (AGENTS.md):
  - Official seed values are copied mechanically. No recalculation.
  - The only normalization applied is representation cleanup:
      * Excel float artifacts on official_food_code ("1088.0" -> "01088",
        canonical zero-padded 5-digit code as used in NutrientAmountExtraction)
      * numeric cells parsed as numbers ("1700.0" -> 1700)
      * empty cells -> null
Outputs:
  seed/frozen/food-master.json
  seed/frozen/nutrient-amount.json
  seed/frozen/nutrient-reference.json
  seed/frozen/unit-conversion.json
  seed/manifest/seed-manifest.json (row counts + sha256 checksums)
"""

import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
WORKBOOK = (
    ROOT
    / "docs/handoff/handoff_for_local_implementation_20260708"
    / "02_seed_extraction_workbook_v0_1_20260707.md"
)
FROZEN_DIR = ROOT / "seed/frozen"
MANIFEST_PATH = ROOT / "seed/manifest/seed-manifest.json"

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

# sheet name -> (worksheet xml, output file, expected data rows)
SHEETS = {
    "FoodMasterApproved": ("sheet5", "food-master.json", 40),
    "NutrientAmountExtraction": ("sheet2", "nutrient-amount.json", 640),
    "NutrientReferenceExtraction": ("sheet3", "nutrient-reference.json", 330),
    "UnitConversionSourceFill": ("sheet4", "unit-conversion.json", 6),
}

# columns that must stay strings even when they look numeric
STRING_COLUMNS = {"official_food_code"}


def read_shared_strings(zf):
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    strings = []
    for si in root.iter(f"{NS}si"):
        strings.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
    return strings


def read_rows(zf, sheet, shared):
    root = ET.fromstring(zf.read(f"xl/worksheets/{sheet}.xml"))
    rows = []
    for row in root.iter(f"{NS}row"):
        values = []
        for cell in row.iter(f"{NS}c"):
            v = cell.find(f"{NS}v")
            if v is None:
                inline = cell.find(f"{NS}is/{NS}t")
                values.append(inline.text if inline is not None else "")
            elif cell.get("t") == "s":
                values.append(shared[int(v.text)])
            else:
                values.append(v.text or "")
        rows.append(values)
    return rows


def normalize_food_code(raw):
    # Excel float artifact: "1088.0" -> canonical zero-padded "01088"
    m = re.fullmatch(r"(\d+)(?:\.0+)?", raw.strip())
    if not m:
        return raw.strip()
    return m.group(1).zfill(5)


def to_cell_value(column, raw):
    if raw is None or raw == "" or raw == "None":
        return None
    raw = raw.strip()
    if column in STRING_COLUMNS:
        return normalize_food_code(raw)
    if re.fullmatch(r"-?\d+(\.\d+)?", raw):
        number = float(raw)
        return int(number) if number.is_integer() else number
    return raw


def extract_sheet(zf, sheet, shared):
    rows = read_rows(zf, sheet, shared)
    header = [h.strip() for h in rows[0]]
    records = []
    for raw_row in rows[1:]:
        padded = list(raw_row) + [None] * (len(header) - len(raw_row))
        record = {col: to_cell_value(col, padded[i]) for i, col in enumerate(header)}
        records.append(record)
    return records


def write_json(path, data):
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    path.write_text(text, encoding="utf-8")
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main():
    zf = zipfile.ZipFile(WORKBOOK)
    shared = read_shared_strings(zf)

    manifest_files = []
    for sheet_name, (sheet, out_name, expected_rows) in SHEETS.items():
        records = extract_sheet(zf, sheet, shared)
        if len(records) != expected_rows:
            raise SystemExit(
                f"{sheet_name}: expected {expected_rows} rows, got {len(records)}"
            )
        checksum = write_json(FROZEN_DIR / out_name, records)
        manifest_files.append(
            {
                "name": out_name,
                "sourceSheet": sheet_name,
                "expectedRows": expected_rows,
                "checksum": f"sha256:{checksum}",
            }
        )
        print(f"{out_name}: {len(records)} rows, sha256:{checksum[:12]}…")

    manifest = {
        "version": "2026-07-07",
        "status": "frozen",
        "source": WORKBOOK.name,
        "extractedAt": "2026-07-14",
        "note": "Mechanically extracted from the approved seed extraction workbook. Do not edit values manually.",
        "files": manifest_files,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"manifest updated: {MANIFEST_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
