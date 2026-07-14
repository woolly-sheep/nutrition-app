# seed

公式・凍結済みの初期データを置く場所です。

```text
seed/frozen:   公式値から作成した固定seedデータ
seed/manifest: 件数、source、checksum、version、frozen status
```

## Rule

```text
Do not recalculate official values in code.
Do not manually patch frozen seed data.
If seed changes, update seed-manifest and validation tests.
```
