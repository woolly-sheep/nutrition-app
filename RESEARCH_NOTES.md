# Research Notes

このテンプレートの根拠。

## Next.js

Next.js Project Structure:
- `app` はApp Router
- `public` は静的アセット
- `src` は任意のapplication source folder
- `route` はAPI endpoint
- `.env*` はversion controlに入れない
- プロジェクト整理はunopinionatedで、共置・外出しを許容

## Twelve-Factor App

- Codebase: 1つのappは1つのcodebase
- Config: deployごとに変わる設定は環境変数へ
- Dependencies: 依存関係を明示する
- Logs: アプリがlogfileを直接管理しない

## pnpm workspace

pnpm workspaceは複数project/packageを1つのrepositoryで扱う場合に有効。
今回のMVP初期では過剰なので、将来の分離候補に留める。
