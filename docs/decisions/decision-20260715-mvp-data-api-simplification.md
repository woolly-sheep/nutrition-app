# decision-20260715-mvp-data-api-simplification

## 決定

UI実装 P0（PR #5〜）における API・データモデルは、handoff 設計書
（05_api_design_v0_2 / 06_data_model_v0_1）から以下の4点を意図的に簡略化する。
いずれも暫定であり、OpenAPI YAML 作成時（application design v0.2 の
CONDITIONAL_GO 解除条件）に正式決定する。

## 簡略化の内容

```text
1. エンドポイント名
   handoff: POST /user-food-items・POST /nutrition-analyses（AnalysisRun）
   MVP:     GET/POST /api/meals・GET /api/analysis
   → UI設計正本（ui_design_v0_1 §6.2）と既存 route 構成に従う

2. 認証・Endpoint Authorization Matrix
   handoff: auth context から user_id 取得・全エンドポイントで owner check
   MVP:     単一ユーザーローカル動作のため未実装（MealRecord に user_id なし）
   → マルチユーザー化・認証導入時に必須で追加する

3. Problem Details
   handoff: type / title / status / detail / instance / error_code / request_id
   MVP:     type / title / status / errors（フィールドコードのみ）
   → request_id / instance は logging 設計の実装と同時に導入する

4. 食事ログのデータモデル（MealRecord）
   handoff: UserFoodItem =「普段食べる食材＋頻度（daily/weekly）」モデルのみで、
            食事単位のログ（日付 × 食事区分 × 品目）のエンティティが存在しない
   MVP:     UI最終案（6a「夕食を記録」）に従い MealRecord
            { meal_id, date, meal_type, items[{food_id, intake_g}], recorded_at }
            を新設。永続化はローカルJSON（data/meals.json・gitignore）
   → data model v0.2 追補時に UserFoodItem（いつもの食事）との関係を正式定義する
     （ui_design_v0_1 §8 未決事項「いつもの食事の保存単位」と同時に解決）
```

## 変わらないもの（handoff 準拠を維持）

- explicit grams first（単位換算は表示のみ・自動換算なし）
- 検索の空結果 = 200 + message（API v0.2 §6）
- logging allowlist（食事内容・分析結果をログ・エラー詳細に含めない）
- レイヤー境界（route.ts 薄く / handlers / domain 純粋 / seed 読み取り専用）
- safe wording（断定・警告色・医療的示唆の不使用）

## 理由

- UI設計 v0.1（decision-20260714 で採用済みの最終正本）が画面↔API対応を
  /api/foods・/api/meals・/api/analysis で定義しており、リポジトリの
  route 構成もこれに一致しているため
- MVP は単一ユーザーのローカル動作であり、認証・マルチユーザー前提の
  API 面を先に固定するより、OpenAPI YAML 作成時にまとめて確定する方が
  手戻りが少ないため

## 影響

- OpenAPI YAML 作成時に、エンドポイント名の統一（/api/meals 維持 or
  handoff 名への移行）・認証・request_id を必ず再検討する
- data model v0.2 追補に MealRecord を追加する
