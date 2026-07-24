# decision-20260724: 製品プリセット・ビタミンK追加・食品未追跡栄養素（omega-3）

- Status: accepted
- Date: 2026-07-24
- Depends on: decision-20260724-supplement-intake（サプリ記録の基盤）
- Context: ユーザーが omega-3・ビタミンK・エビオス錠（10錠あたりの成分）を
  登録したいと要望。既存のサプリ記録は22栄養素・都度入力のみだった。

## 決定

### 1. ビタミンK を23番目のシード栄養素として追加（食品も追跡）
- 公式の目安量(AI)があり MEXT 本表に VITK 列があるため、6栄養素追加(#26)と
  同じ方式で食品成分（全2,538品目）＋基準値（AI・成人150μg・**ULなし**）を追加。
- 抽出=`scripts/add_vitamin_k_from_mext.py`（既存22栄養素の再現一致を検証してから追記）
  ／基準値=`scripts/add_vitamin_k_references_2025.py`（報告書 p.184 転記）。
- 花の脂溶性ビタミン群・分割バー・週次に自動で載る。既存データは1行も変更なし。

### 2. omega-3(n-3) は「食品未追跡の参照栄養素」として扱う
- 公式の目安量(AI)はあるが、**食品側の成分値は MEXT 本表になく脂肪酸成分表が
  必要**。今のシードでは食品からの n-3 を計算できない。
- そのため n-3 はシードに入れず、AI を出典付きドメイン定数
  （`foodUntrackedNutrients.ts`）に持つ。サプリ記録は可能で、AIとの**参考比較**
  （サプリ分のみ）を専用セクションに表示する。
- **食品vsサプリの分割は出さない**（食品を追跡していないのに food=0 と表示すると
  「食品からは摂れていない」と誤読させるため）。「食品は未追跡」と明記する。

### 3. 製品プリセット（エビオス錠の「10錠あたり」）
- 新エンティティ `data/supplement-products.json`: `{name, serving_count,
  serving_unit, amounts}`。成分は `serving_count`（例10）`serving_unit`（例錠）
  あたりの自己申告値。
- 記録時は製品＋飲んだ数を選ぶ → amounts を `count / serving_count` で
  スケールし、**通常のサプリ記録として保存**（分析側は既存のまま・record.amounts
  が正本）。プリセットは入力の便宜であり、判定ロジックには影響しない。

## 影響

| 層 | 変更 |
| --- | --- |
| seed | ビタミンK追加（amount 55,836→58,374／reference 480→490／NUTRIENTS_PER_FOOD 22→23）。manifest チェックサム更新 |
| domain | `foodUntrackedNutrients.ts`（omega-3 AI・評価）。nutrientGroups にビタミンK |
| store | `supplementProductStore.ts` 新設 |
| server | `saveSupplementProduct` ハンドラ・`GET/POST /api/supplement-products`・`DELETE /api/supplement-products/{id}`。`getDailyAnalysis` に food_untracked セクション。backup が製品を含める |
| schema | supplement 栄養素リストに vitamin_k・omega3_g を追加。`FoodUntrackedItem`。BackupFile に supplement_products |
| UI | 記録タブに `SupplementProductManager`（製品登録・錠数で記録）。分析タブに「サプリからの摂取（食品は未追跡）」セクション |

## 意図的に採らなかった選択肢

- **omega-3 を食品も含めて追跡**: 脂肪酸成分表の抽出が必要でコストが跳ねる。
  今回は見送り、サプリ側の参考比較まで。
- **omega-3 を食品vsサプリ分割で表示**: food=0 が事実に反する。
- **omega-3 を基準比較なしで記録だけ**: ユーザーは公式基準での比較を選択。
- **製品プリセットに独自の判定ロジック**: 記録は既存のサプリ記録に還元し、
  分析経路を増やさない。

## 未決

- ビタミンK は DRI 2025 で UL なし。過剰の判定対象にはならない（AI 比較のみ）。
- エビオス錠等の実際の成分値はユーザーが製品ラベルから入力する（公式値ではない
  ため推測で埋めない）。
