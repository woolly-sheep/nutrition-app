/** Source + estimate note required on home/analysis (UI design §5). */

type Props = {
  sources: readonly string[];
};

export function SourceFooter({ sources }: Props) {
  return (
    <footer style={{ marginTop: "24px" }}>
      <p style={{ color: "var(--color-subtext)", fontSize: "12px", margin: 0 }}>
        出典: {sources.join("・")}。表示は推定値です。
      </p>
    </footer>
  );
}
