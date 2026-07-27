import { updateSupplementProductRecord } from "../../store/supplementProductStore";
import type { ProblemDetails } from "../errors/problem";
import type {
  CreateSupplementProductRequest,
  SupplementProduct,
} from "../schemas/supplementProducts";
import { validateSupplementProductBody } from "./saveSupplementProduct";

export type UpdateSupplementProductResult =
  | { ok: true; product: SupplementProduct }
  | { ok: false; problem: ProblemDetails };

/**
 * Replaces one product preset's name, serving basis and amounts (issue #70).
 * Same rules as saving; the product keeps its id and created_at. Unknown id
 * is a 404. Composition stays self-reported — never a seed value.
 */
export async function updateSupplementProduct(
  productId: string,
  body: unknown,
  persist: (
    id: string,
    input: CreateSupplementProductRequest,
  ) => Promise<SupplementProduct | null> = updateSupplementProductRecord,
): Promise<UpdateSupplementProductResult> {
  const validated = validateSupplementProductBody(body);
  if (!validated.ok) {
    return validated;
  }

  const product = await persist(productId, validated.value);
  if (product === null) {
    return {
      ok: false,
      problem: {
        type: "about:blank",
        title: "指定された製品が見つかりません。",
        status: 404,
      },
    };
  }
  return { ok: true, product };
}
