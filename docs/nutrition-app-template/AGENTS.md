# AGENTS.md

AI/Codex/Claude がこのリポジトリを編集する時のルール。

## 最初に読む

```text
docs/handoff/00_README_handoff_for_local_implementation_20260708.md
README.md
STRUCTURE_GUIDE.md
```

## 絶対ルール

```text
- Do not modify official seed values manually.
- Do not recalculate official MHLW/MEXT values in code.
- Put nutrition logic in src/domain, not src/app/api and not src/features.
- Put seed loading/validation in src/seed.
- Keep seed data in seed/frozen.
- Keep route.ts thin. Delegate API logic to src/server/api/handlers.
- Do not log raw request bodies.
- Do not log raw response bodies.
- Do not log meal contents, analysis results, recommendation text, or health-sensitive details.
- Do not add medical advice wording.
- Run seed validation tests before relying on seed data.
```

## どこに書くか

```text
UI / screen behavior:         src/features
Reusable UI:                  src/components
Next.js route/page/layout:    src/app
HTTP endpoint entry:          src/app/api/**/route.ts
API schema / handler / error: src/server/api
Nutrition logic:              src/domain
Seed loading / validation:    src/seed
Frozen official seed data:    seed/frozen
Seed manifest / checksum:     seed/manifest
Cross-cutting scripts:        scripts
Integration / E2E / safety:   tests
```
