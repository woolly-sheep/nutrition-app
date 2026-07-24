import type { SupplementAmount } from "./supplements";

/**
 * 製品プリセット (decision-20260724-supplement-products). A product's nutrient
 * composition per a stated serving (e.g. エビオス錠「10錠あたり」), saved once so
 * repeat logging is a tap + a count. Composition is self-reported from the
 * product label — never a seed value. Amounts are per `serving_count` units of
 * `serving_unit`; when logging N units, amounts scale by N / serving_count.
 */

export type SupplementProduct = {
  product_id: string;
  name: string;
  /** Serving basis the amounts are stated for, e.g. 10. */
  serving_count: number;
  /** Serving unit label, e.g. "錠" / "粒" / "包". */
  serving_unit: string;
  amounts: readonly SupplementAmount[];
  created_at: string;
};

export type CreateSupplementProductRequest = {
  name: string;
  serving_count: number;
  serving_unit: string;
  amounts: readonly SupplementAmount[];
};
