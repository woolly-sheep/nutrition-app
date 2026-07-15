import Link from "next/link";

// Placeholder until the daily-summary feature lands (UI design §7 P0-2).
// Wording follows the 6c first-day empty state.
export default function HomePage() {
  return (
    <div>
      <h1 style={{ fontSize: "20px" }}>今日のサマリー</h1>
      <p>最初の1食を記録すると、食事摂取基準(2025)との比較が始まります。</p>
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
      <p style={{ color: "var(--color-subtext)", fontSize: "13px" }}>
        このアプリは事実の提示のみを行い、診断・助言はしません。
      </p>
    </div>
  );
}
