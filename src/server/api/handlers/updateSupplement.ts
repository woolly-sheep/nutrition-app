import { updateSupplementRecord } from "../../store/supplementStore";
import type { ProblemDetails } from "../errors/problem";
import type { CreateSupplementRequest, SupplementRecord } from "../schemas/supplements";
import { validateSupplementBody } from "./saveSupplement";

export type UpdateSupplementResult =
  | { ok: true; supplement: SupplementRecord }
  | { ok: false; problem: ProblemDetails };

/**
 * Replaces one supplement record's product name and amounts (issue #31).
 * Same validation rules as saving; the record keeps its original day and
 * identity — only the label values change. Editing to an unknown id is a 404.
 */
export async function updateSupplement(
  supplementId: string,
  body: unknown,
  persist: (
    id: string,
    input: Pick<CreateSupplementRequest, "product_name" | "amounts">,
  ) => Promise<SupplementRecord | null> = updateSupplementRecord,
): Promise<UpdateSupplementResult> {
  const validated = validateSupplementBody(body);
  if (!validated.ok) {
    return validated;
  }

  const supplement = await persist(supplementId, {
    product_name: validated.value.product_name,
    amounts: validated.value.amounts,
  });
  if (supplement === null) {
    return {
      ok: false,
      problem: {
        type: "about:blank",
        title: "指定されたサプリメントの記録が見つかりません。",
        status: 404,
      },
    };
  }
  return { ok: true, supplement };
}
