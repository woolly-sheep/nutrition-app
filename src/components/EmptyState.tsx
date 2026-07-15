import Link from "next/link";

/**
 * First-day empty state (6c): one focused CTA, what-the-app-does list,
 * and the no-diagnosis note. No user name until auth design lands
 * (UI design §8).
 */

type Props = {
  dateLabel: string;
};

export function EmptyState({ dateLabel }: Props) {
  return (
    <div>
      <p style={{ color: "var(--color-subtext)", fontSize: "13px", margin: 0 }}>
        {dateLabel}
      </p>
      <h1 style={{ fontSize: "20px", margin: "8px 0" }}>
        最初の1食を記録すると
        <br />
        基準値との比較が始まります
      </h1>
      <p style={{ color: "var(--color-subtext)", fontSize: "14px" }}>
        分析には最低1食のデータが必要です。直近の食事1つだけで構いません。
      </p>
      <Link
        href="/meals"
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "var(--tap-target-min)",
          padding: "0 20px",
          borderRadius: "8px",
          background: "var(--color-primary)",
          color: "var(--color-base)",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        最初の食事を記録する
      </Link>

      <section
        style={{
          marginTop: "24px",
          padding: "12px 16px",
          borderRadius: "10px",
          background: "var(--color-surface)",
        }}
      >
        <h2 style={{ fontSize: "14px", margin: "0 0 8px" }}>
          このアプリができること
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: "18px",
            fontSize: "13px",
            lineHeight: 1.8,
          }}
        >
          <li>日本食品標準成分表(八訂)で栄養価を自動計算</li>
          <li>食事摂取基準(2025)のあなたの区分と比較</li>
          <li>不足量を食品の量に換算して表示</li>
        </ul>
      </section>

      <p style={{ color: "var(--color-subtext)", fontSize: "12px" }}>
        事実の提示のみを行い、診断・助言はしません
      </p>
    </div>
  );
}
