# decision-20260716-openapi-mvp-contract

## 決定

`docs/api/openapi.yaml` を API 契約の正本として作成し、MVP のエンドポイント名は
実装済みの `/api/*` 系（foods / meals / meals/usual / profile / analysis /
analysis/candidates）を**正式採用**する。

これは decision-20260715-mvp-data-api-simplification が
「OpenAPI YAML 作成時に正式決定」と保留していた項目の決定である。
application design v0.2 の CONDITIONAL_GO 解除条件のうち
「OpenAPI YAML artifact」を本成果物で満たす。

## 理由

- UI設計 v0.1 §6.2（画面↔API対応）と実装（PR #5〜#9）が既に /api/* で一貫している
- handoff 05_api_design_v0_2 の /user-food-items・/nutrition-analyses 系は
  認証・マルチユーザー・AnalysisRun 永続化を前提とした設計であり、
  単一ユーザー・ローカルJSONの MVP では過剰
- 契約チェック（scripts/check-api-contract.ts）で spec と実装の乖離を CI 検出できる

## 将来の再検討条件

認証・マルチユーザー化の実装時に、以下をまとめて再設計する:

```text
- /user-food-items / /nutrition-analyses（AnalysisRun 永続化）への移行
- Endpoint Authorization Matrix（owner check）の適用
- Problem Details への request_id / instance / error_code 追加
- POST /user-data:delete（ユーザーデータ削除）
```

## 影響

- API 変更時は openapi.yaml を同一 PR で更新する
  （check-api-contract が spec と route の乖離で CI を落とす）
