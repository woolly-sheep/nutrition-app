/**
 * Minimal RFC 9457 Problem Details shape for API error responses.
 * Details carry field names / codes only — never meal contents or
 * request bodies (logging & response hygiene).
 */

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  /** Machine-readable codes for invalid fields (no user data). */
  errors?: readonly string[];
};

export function validationProblem(errors: readonly string[]): ProblemDetails {
  return {
    type: "about:blank",
    title: "リクエスト内容を確認してください。",
    status: 422,
    errors,
  };
}
