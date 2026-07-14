# src

アプリケーションのsource folderです。

```text
src/app:        Next.js App Router。page/layout/routeなどの入口
src/features:   UI機能単位
src/domain:     UIやHTTPに依存しない栄養ドメインロジック
src/seed:       seed/frozenを読み込み、検証するコード
src/server/api: API schema、handler、error mapping
src/components: 汎用UI component
src/lib:        domainではない小さな共通処理
src/styles:     styling
```
