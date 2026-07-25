# 重点栄養素ボード＋DG「以上」型の充足率反映

- 日付: 2026-07-25
- ステータス: 採用
- 関連: [[decision-20260722-home-bloom-dashboard]] / [[decision-20260724-dashboard-insights]] / [[decision-20260717-energy-ratio-dg]] / 健康安全 wording policy v0.1
- 対応 issue: #34（重要度の高い栄養素の可視化）/ #35（食物繊維が反映されない）

## 背景

- **#35**: 食物繊維は基準として **目標量(DG)「◯以上」だけ**を持つ唯一の花びら栄養素。
  日次サマリの充足判定は RDA/AI（`recommended_dietary_allowance` / `adequate_intake`）限定だったため、
  食物繊維は常に `others` に落ち、`percent_of_reference` が付かず、花の「繊維」花びらが**常に空**だった。
- **#34**: 花は6グループの**平均**を見せるため、個別に重要な栄養素が平均に埋もれて充足が分からない。

## 決定

### #35 — DG「以上」型を充足率対象に昇格
`summarizeDailyIntake` の comparable 判定を拡張し、`tentative_dietary_goal` かつ
**`at_least`（「◯以上」）** の目標量を、最小値を目標として `percent = intake / min × 100` で比較可能にする。
- `range`（%Eバランス）・`less_than`（食塩）・条件付き値は従来どおり対象外（上限・範囲であり「多いほど良い」ではない）。
- 1栄養素1枠に集約し、**RDA/AI を DG より優先**（カリウムは AI を採用し、DG は `others` に残す）。
  → `within_goal_count` / `dg_over` の既存挙動は不変。

### #34 — 「重点栄養素」ボードをホームに新設
**「重点栄養素」の定義 = 食事摂取基準(2025)自身が目標量(DG)を定めた栄養素**（＝生活習慣病の
発症予防に関わると国が指定した栄養素）。**凍結seedの `reference_type` だけで出典を完全に示せる
唯一の「公式データ由来」定義**であり、事実提示ポリシー（医療的重要度ランキングを作らない）を満たす。

- 却下案: 「不足しがち」を根拠にカルシウム・鉄・ビタミンD等を含める案。根拠となる
  国民健康・栄養調査がリポジトリに無く、事実として引用できないため見送り（ユーザー承認済み・2026-07-25）。

ボードは DG 栄養素を**1つずつ**、目標量の性質で3方向に分類して表示：
1. **gain（しっかり摂りたい・「以上」）** 食物繊維・カリウム — 最小値までのメーター、達成でゴールド
2. **balance（エネルギーの構成・%目標範囲）** たんぱく質・脂質・炭水化物 — %E をレンジ上のマーカーで表示
3. **limit（控えめに・「未満」）** 食塩相当量 — 上限までのメーター、超過は淡色＋「上回る」

配置は花＋キャプションの直下（花=感情層、ボード=最初の詳細層／段階開示）。

## 制約の遵守

- **赤は不使用**。達成＝ゴールド、それ以外は teal／グレーの淡色。断定なし・すべて推定表現。
- ボードの文言（`label`）は SafeWordingService 経由（各栄養素の DG 判定から取得）。
- balance の %E は当日にエネルギー摂取がある時のみ（`energyRatioPercent`）。無い日は「記録待ち」。
- 出典を明記：「日本人の食事摂取基準(2025) 目標量 ・ 表示は推定値です」。

## 実装

- domain: `analysis/focusNutrients.ts`（純粋関数・単体テスト7件）／`analysis/summarizeDailyIntake.ts`（#35拡張・回帰テスト2件）
- schema: `FocusNutrientItem` を追加し `summary.focus_nutrients` を応答へ
- handler: `getDailyAnalysis.ts` で judgments から算出・wording を付与
- UI: `components/FocusNutrients.tsx`（純表示）＋ `DailySummaryScreen` に挿入
- テスト 189 → 198（全 pass）。既存データ・seed は 1 行も変更なし。

## 未決・次

- ユーザーが希望すれば「重点」に不足注目素（Ca/Fe/D）を含める拡張余地あり（要・出典整備）。
- openapi.yaml への `focus_nutrients` 追記（api-contract 同期）は次コミットで実施。
