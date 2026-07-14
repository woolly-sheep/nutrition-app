# Structure Guide

## Final structure

```text
nutrition-app/
├── docs/
├── seed/
├── public/
├── src/
│   ├── app/
│   ├── features/
│   ├── domain/
│   ├── seed/
│   ├── server/
│   ├── components/
│   ├── lib/
│   └── styles/
├── tests/
└── scripts/
```

## Design decisions

### 1. Single `src/`

MVP初期は `src/` を1つに寄せます。
`apps/web/src` や `packages/domain/src` などに分けるのは、複数アプリ・独立package・CI分割が必要になってからで十分です。

### 2. Seed data outside `src`

公式seedの実体は `seed/frozen/` に置きます。
`src/seed/` には読み込み・検証コードだけを置きます。

### 3. Thin route handlers

`src/app/api/**/route.ts` は薄く保ちます。
実処理は `src/server/api/handlers/` に置きます。

### 4. Domain is pure

`src/domain/` はUI、HTTP、DB詳細に依存しない純粋ロジックにします。

### 5. Features are UI-facing

`src/features/` は画面単位のUIと操作をまとめます。
栄養計算は置きません。

## When to split into packages later

```text
- Web以外にCLIやbatchができた
- APIを別アプリとして切り出した
- domain logicを別packageとして配布したい
- seed validatorを独立ツール化したい
- 複数人/複数AIが同時に別領域を触る
- CIでpackageごとに独立テストしたい
```
