/**
 * ✓ + accent gold chip. The ONLY place --color-accent may be used
 * (5a semantics: gold is achievement badges/chips, never bar fills).
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
        borderRadius: "999px",
        background: "var(--color-accent)",
        color: "var(--color-text)",
        fontSize: "13px",
        fontWeight: 700,
      }}
    >
      <span aria-hidden="true">✓</span>
      {text}
    </span>
  );
}
