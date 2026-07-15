/**
 * Single-value form of the intake estimate (intake_g × amount_per_100g / 100).
 * UI previews must use this instead of re-implementing the formula
 * (nutrition logic stays in src/domain).
 */
export function estimateIntakeAmount(
  intakeG: number,
  amountPer100g: number,
): number {
  return (intakeG * amountPer100g) / 100;
}
