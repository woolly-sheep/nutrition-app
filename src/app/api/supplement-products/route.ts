// Thin HTTP entrypoint. Never log product contents here (logging allowlist).

import { NextResponse } from "next/server";
import { saveSupplementProduct } from "../../../server/api/handlers/saveSupplementProduct";
import { listSupplementProducts } from "../../../server/store/supplementProductStore";

export async function GET() {
  return NextResponse.json({ products: await listSupplementProducts() });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const result = await saveSupplementProduct(body);

  if (!result.ok) {
    return NextResponse.json(result.problem, {
      status: result.problem.status,
    });
  }
  return NextResponse.json({ product: result.product }, { status: 201 });
}
