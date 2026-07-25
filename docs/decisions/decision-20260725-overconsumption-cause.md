# 過剰摂取の原因食材（過去1年の寄与度内訳）

- 日付: 2026-07-25
- ステータス: 採用
- 関連: [[decision-20260724-dashboard-insights]]（寄与度②）/ [[decision-20260725-eaten-foods-nutrient-finder]]（②③）/ 健康安全 wording policy
- 対応 issue: #28 ①（過剰摂取の原因となっている食材の把握）

## 背景

#28 の3目的のうち①「過剰摂取の原因食材の把握」が未対応だった。
- 寄与度②（PR#36）は**不足行（あと少し）**にしか接続しておらず、過剰側には内訳がなかった。
- 食塩は「栄養素から探す」finder の対象外（more-is-better 限定・テスト固定）なので、過剰は
  finder ではなく**寄与度側**で扱うのが筋。

## 決定（ユーザー確認済み）

**過剰行に「過去1年の寄与度内訳」を接続する。**（当日ではなく過去1年集計）

- 「過剰の原因」＝**習慣的な犯人**（うどん・カレー・みそ等）。1日の内訳はノイズが多く、
  期間集計の方が原因把握に適する。②③の「食べた食材から」と**同じ過去1年の窓**に揃える。
- ホーム「気をつけたい」の各過剰行（UL到達・DG超過）をタップ → 展開して、
  **過去1年でその栄養素を多く摂った自分の食材トップN**を食品別バー＋凡例で表示。
- 事実提示のみ: 「過去1年で〇〇を多く摂った食材（参考・推定）」＋「分量や頻度の多い食材が
  上位に出ます。摂り方を見直す手がかりにどうぞ。」。**赤なし・断定なし・"食べるな"と言わない**。
  内訳セグメントは不足行と同じ中立ティール（1色1意味）。

## 実装

- schema `NutrientContributionResponse` に `window: "day" | "year"` を追加。
- handler `getNutrientContribution(date, nutrient, window="day", deps)`:
  - `window="year"` は全 meals を読み、`date` を末日とする過去365日に絞って集計。
  - domain `nutrientContribution`（item列→寄与）は期間非依存なので**変更なし**。
  - notice を window で出し分け。
- route `GET /api/analysis/contribution?window=year`（既存エンドポイントにパラメータ追加・
  契約は22オペのまま）。`window` 未指定・不正は "day"。
- UI: 新規 `OverCauseRow`（ShortfallRow のバー＋凡例を踏襲・`window=year` を遅延取得）を
  ホーム「気をつけたい」に接続。旧・静的行と `watchRow` スタイルは削除。

## スコープ外（次の候補）
- 分析タブの UL/DG 超過セクションへの同内訳の展開（同じ `OverCauseRow` で再利用可能）。

## 影響
- テスト 198 → 200（year 窓の集計・境界除外／day 既定の2件）。
- 契約は22オペのまま・`window` パラメータとレスポンスフィールドを追加。
- 既存データ・凍結seed・栄養計算は不変（read-only の集計ビュー）。不足行（ShortfallRow）は
  window 未指定＝day のままで挙動不変。
