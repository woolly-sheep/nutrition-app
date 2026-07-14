# nutrition-app

栄養管理アプリ MVP の開発用テンプレートです。

## 採用方針

- 1 repo / 1 Next.js app / 1 `src/`
- 公式 seed データは root の `seed/frozen/` に隔離
- seed の読み込み・検証コードは `src/seed/`
- 栄養計算・基準値比較などの純粋ロジックは `src/domain/`
- HTTP入口は `src/app/api/**/route.ts`
- APIのschema / handler / error mappingは `src/server/api/`
- UI機能は `src/features/`
- 横断テストはrootの `tests/`

## 最初に読むもの

1. `docs/handoff/00_README_handoff_for_local_implementation_20260708.md`
2. `AGENTS.md`
3. `STRUCTURE_GUIDE.md`
4. `seed/manifest/seed-manifest.json`

## First task

```text
Start with read-only seed access and validation tests.
Do not modify official seed values.
Do not recalculate official MHLW/MEXT values in code.
```

## セットアップ例

```bash
pnpm install
pnpm test
pnpm seed:validate
```
