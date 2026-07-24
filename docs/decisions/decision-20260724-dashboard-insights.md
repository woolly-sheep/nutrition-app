# ダッシュボード示唆強化（意味→原因→傾向）

- 日付: 2026-07-24
- ステータス: 採用
- 関連: [[decision-20260722-home-bloom-dashboard]] / UI design v0.1 §4.1・v0.2 addendum / 健康安全 wording policy v0.1

## 背景

ホームの花ダッシュボード（#21〜#22）はデータ（花・バー・バッジ）を提示するが、
「今日はどうだったか（意味）」「なぜか（原因）」「続いているか（傾向）」を言葉で語らない。
示唆強化として4案（冒頭一文／寄与度／28日スパークライン／small multiples）が提案されていた。

## 決定

4案を **役割で並べ替え**、「意味 → 原因 → 傾向」の一本の線として実装する。
初期表示は静かに保ち（一文＋花＋6バー）、詳細は段階開示（タップで展開）する。

1. **① 冒頭の一文（意味）** — ヘッダー直下・花の上に常設。
   `buildDailyHeadline`（純粋関数）が `summary` の件数から生成。**新API不要・ルールベース**。
2. **② 栄養素の寄与度（原因）** — 「あと少し」行をタップで展開。食品別の寄与を積み上げバーで表示。
   `GET /api/analysis/contribution?date&nutrient`。既存 `meal_breakdown` と同じ「事実のみ」設計を不足側へ展開。
3. **③ 28日スパークライン（傾向）** — 不足が最も続く**最上位1種のみ**、展開時に表示。
   `GET /api/analysis/trend?date&nutrient&days`。充足率（intake ÷ 当日基準 ×100）の時系列で、100%線が固定の目安になる。
4. **④ small multiples — 不採用**。既存「今週の庭」と役割が重複するため、静けさを優先して見送る。

## 制約の遵守

- 文言はすべて推定・傾向表現（断定なし）。`buildDailyHeadline` / `trendReading` とも「推定」を保持。
- **赤は不使用**。寄与度の積み上げは intake の teal 単一色相の濃淡（1色=1意味）。目安線は花と同じゴールド点線。
- 記録のない日は `percent=null`（0埋めしない）。平均・傾向は記録日のみ。
- 内訳・時系列はコードと量のみ。**ログには食事内容を出さない**（logging allowlist を継承）。
- スパークラインは `vectorEffect=non-scaling-stroke`、装飾アニメーションなし（reduced-motion 配慮不要な静的描画）。

## 実装

- domain: `summaryHeadline.ts` / `nutrientContribution.ts`（純粋関数・単体テスト）
- handler: `getNutrientContribution.ts` / `getNutrientTrend.ts`（profile/seed 差し替え可能・テスト付き）
- route: `api/analysis/contribution` / `api/analysis/trend`（薄いHTTP入口・422バリデーション）
- UI: `ShortfallRow.tsx`（展開・遅延fetch）＋ `Sparkline.tsx`＋ `DailySummaryScreen` に一文追加
- openapi.yaml に2エンドポイント＋スキーマを追記（api-contract チェック同期）

## 影響

- テスト 171 → 189（+18）。既存データ・seed は不変。新APIは記録なし・区分未設定でも正常系（空）を返す。
