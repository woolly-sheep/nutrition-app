/**
 * Adaptive amount formatting (#77). One decimal for everything read too many
 * digits — "あと669.4mg" or "152.1mg" carry a tenths place that is noise at
 * that scale. Precision now follows magnitude so large figures round clean
 * (669mg, 1678mg) while small ones keep the detail that matters (8.5g, 0.6mg,
 * 0.25mg). Trailing zeros are dropped. Facts only — this is display rounding,
 * never applied to stored or computed values (seed math stays exact).
 */
export function formatAmount(value: number): string {
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 0 : abs >= 1 || abs === 0 ? 1 : 2;
  return String(Number(value.toFixed(decimals)));
}
