import type { OfficialValue } from "../../seed/types";

/**
 * Read-only interpretation of official reference values. The original
 * value is never rewritten — parsing only classifies the notation so the
 * judgment layer knows how (or whether) it can compare against intake.
 *
 * Known notations preserved in the frozen seed:
 *   42            plain number
 *   "13-20"       range
 *   "17以上"       at-least threshold
 *   "6.5未満"      less-than threshold
 *   "6.0 no_menses / 10.0 menses"  condition-dependent pair
 *   "not_established"
 */
export type ParsedOfficialValue =
  | { kind: "exact"; value: number }
  | { kind: "range"; min: number; max: number }
  | { kind: "at_least"; min: number }
  | { kind: "less_than"; max: number }
  | { kind: "conditional"; raw: string }
  | { kind: "not_established" }
  | { kind: "unparsable"; raw: string };

const RANGE_PATTERN = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/;
const AT_LEAST_PATTERN = /^(\d+(?:\.\d+)?)以上$/;
const LESS_THAN_PATTERN = /^(\d+(?:\.\d+)?)未満$/;
const CONDITIONAL_PATTERN = /no_menses|menses/;

export function parseOfficialValue(value: OfficialValue): ParsedOfficialValue {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { kind: "exact", value };
  }
  if (typeof value !== "string") {
    return { kind: "unparsable", raw: String(value) };
  }

  const trimmed = value.trim();
  if (trimmed === "not_established") {
    return { kind: "not_established" };
  }
  if (CONDITIONAL_PATTERN.test(trimmed)) {
    return { kind: "conditional", raw: trimmed };
  }

  const range = trimmed.match(RANGE_PATTERN);
  if (range) {
    return { kind: "range", min: Number(range[1]), max: Number(range[2]) };
  }
  const atLeast = trimmed.match(AT_LEAST_PATTERN);
  if (atLeast) {
    return { kind: "at_least", min: Number(atLeast[1]) };
  }
  const lessThan = trimmed.match(LESS_THAN_PATTERN);
  if (lessThan) {
    return { kind: "less_than", max: Number(lessThan[1]) };
  }
  return { kind: "unparsable", raw: trimmed };
}
