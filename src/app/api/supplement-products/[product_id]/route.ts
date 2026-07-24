// Thin HTTP entrypoint. Never log product contents here (logging allowlist).

import { NextResponse } from "next/server";
import { deleteSupplementProduct } from "../../../../server/store/supplementProductStore";

type RouteContext = { params: Promise<{ product_id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { product_id } = await params;
  const deleted = await deleteSupplementProduct(product_id);
  if (!deleted) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "指定された製品が見つかりません。",
        status: 404,
      },
      { status: 404 },
    );
  }
  return NextResponse.json({ deleted: true });
}
