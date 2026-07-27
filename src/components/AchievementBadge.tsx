/**
 * ✓ + achievement chip. The ONLY place the accent (gold) meaning may be used
 * (5a semantics: gold is achievement badges/chips, never bar fills). #86 dials
 * the loud solid gold down to a soft gold ground + gold ink/line so a row of
 * chips reads calmly — the meaning (accent = achievement) is unchanged.
 */

type Props = {
  text: string;
};

export function AchievementBadge({ text }: Props) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 10px",
        borderRadius: "var(--radius-pill)",
        background: "var(--color-accent-soft)",
        color: "var(--color-accent-ink)",
        border: "1px solid var(--color-accent-line)",
        fontSize: "13px",
        fontWeight: 700,
      }}
    >
      <span aria-hidden="true">✓</span>
      {text}
    </span>
  );
}
