# 栄養素ごとの食材内訳（行クリックで展開）

- 日付: 2026-07-25
- ステータス: 採用
- 関連: [[decision-20260724-dashboard-insights]]（寄与度②）/ [[decision-20260725-overconsumption-cause]]（過剰の原因①・window=year）
- 対応 issue: #44（各栄養素でどの食材でどれだけ摂取したのか詳細も知りたい）

## 背景

寄与度の内訳は「不足行（当日）」「過剰行（過去1年）」にしか露出しておらず、
**任意の栄養素の食材別内訳を見る手段**がなかった。

初版はドロップダウンで栄養素を選ぶ独立セクションにしたが、ユーザーの指摘
「選択式ではなく、基準値比較や充足率の栄養素をクリックして表示できるように」を受けて
**行クリックで展開する方式**に変更した（既に見ている栄養素をその場で深掘りできる）。

## 決定（ユーザー確認済み）

- **見せ方 = 1栄養素を選んで深掘り**。ただし**独立ドロップダウンは廃止**し、
  既存リストの**栄養素の行をタップ**すると、その場で食材別内訳が開く。
  - 分析タブ「基準値比較（推奨量・目安量）」の各行（`NutrientBarRow`）
  - 週次「充足率レポート」ヒートマップの各栄養素行（`WeeklyReport` の名前セル）
- **期間 = この日 / 過去1年 の切替**（展開パネル内のトグル）。この日＝分析している日、
  過去1年＝`date` を末日とする365日集計（①②③と同じ窓）。
- **API変更なし**: 既存 `GET /api/analysis/contribution?date&nutrient&window=day|year` を再利用
  （任意の栄養素・両ウィンドウに対応済み）。契約26オペのまま。
- 内訳は食材名＋**実際の摂取量(g等)＋%** を併記。事実提示のみ・赤なし・中立ティール
  （1色1意味）・出典/推定 notice 付き。

## 実装
- `src/features/reference-comparison/ContributionPanel.tsx`（再利用パネル: この日/過去1年
  トグル＋内訳バー/凡例・自前 fetch）。
- `AnalysisScreen` の `NutrientBarRow` をボタン化し、開くと `ContributionPanel` を展開。
- `WeeklyReport` のヒートマップ名前セルをボタン化し、その行の下に全幅で `ContributionPanel`
  を展開（`colSpan`）。
- 初版のドロップダウン（`NutrientBreakdown.tsx`）と client-safe カタログ
  （`nutrientCatalog.ts`＋テスト）は不要になったため削除（行が既に code/name を持つ）。

## スコープ外
- 内訳バー/凡例は ShortfallRow・OverCauseRow・ContributionPanel で似た描画を持つ。将来
  共通表示コンポーネントへ集約可能（今回は ContributionPanel を新設・既存2つは不変）。
- ヒートマップは週表示だが内訳の「この日」は分析日を指す。週ウィンドウの集計は未対応
  （必要なら window=week を追加）。

## 影響
- 契約26オペのまま（エンドポイント再利用）。テストは216（初版の catalog テストは削除）。
- 既存データ・seed・栄養計算は不変（read-only）。
