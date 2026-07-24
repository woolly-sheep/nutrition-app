# decision-20260722-full-mext-catalog

## 決定

食材カバレッジを **公式 MEXT 八訂（増補2023）第2章 本表の全 2,538 品目**に拡張する。
栄養値は公式表をそのまま転記し、再計算しない（AGENTS.md）。

## 出典 / 抽出

- 出典: `seed/source/mext_ch2_honpyo.xlsx`（文科省・公開）
  - `https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_02.xlsx`
- 抽出: `scripts/build_seed_from_mext.py`（成分識別子で16栄養素の列を特定）
- 公式表記の変換規則（既存40品目の慣習と一致）:
  - 数値 → `official_value`
  - `(x)` → `parenthesized_official_value`（`(0)`→0）
  - `Tr` / `(Tr)` → `trace`（0）
  - `-`（未測定）→ `not_measured`（**null**。0 にしない）
- 既存の40品目（キュレーション済みの food_id / display_name）は**そのまま保持**し、
  残り2,498品目のみ Excel から生成（food_id = `food_<食品番号>`）

## 軽さの担保（全2,538でも重くしない）

- **compactな実データ**: `nutrient-amount.json` は
  `[food_id, nutrient_code, amount, value_status]` のタプル配列（約2.3MB）。
  `loadSeed` が定数プロヴェナンス＋栄養辞書で完全レコードに rehydrate する。
  これで従来形の約25MB → 約3MB に圧縮（rehydrate 結果は既存640行と完全一致）
- **索引化**: `getEnergyByFoodId`（40,608行の線形 `.find` を O(1) に）
- **検索の上限**: `MAX_RESULTS=50`。空クエリはブラウズ用に先頭50件のみ返す
- 集計・検索はすべてサーバー側。ブラウザには検索結果だけ返るため品目数に非依存

## not_measured（null）の扱い

`-`（未測定）は **null（不明）** として保持し、0 とは区別する。
既存の `calculateNutrientIntake` は非数値を「非数値の公式値」警告として
スキップするため、未測定を 0 と誤って合算しない。

## 影響

- 蜂蜜・アスパラガス等、日常食材をほぼカバー
- 標準重量（個数入力）は従来どおり少数キュレーション。未登録食材は g 入力へフォールバック
- API 契約・集計ロジックは不変（記録の実体は g）

## 今後

- 個数入力の標準重量は必要に応じて追加（ユーザー設定 or 参照登録）
- さらなる正確性が要る場合はアミノ酸/脂肪酸/炭水化物成分表編の取り込みを別途検討
