# tests

横断テストを置きます。

```text
tests/integration: API + domain + seedの結合テスト
tests/e2e:         ブラウザ/画面シナリオ
tests/fixtures:    テスト用fixture
tests/safety:      wording/logging/security safety tests
```

小さな単体テストは `src/**/*.test.ts` として実装横に置いてもよいです。
