// Thin HTTP entrypoint. Never log supplement contents here (logging allowlist).

import { NextResponse } from "next/server";
import { deleteSupplement } from "../../../../server/store/supplementStore";

type RouteContext = { params: Promise<{ supplement_id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { supplement_id } = await params;
  const deleted = await deleteSupplement(supplement_id);
  if (!deleted) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "指定されたサプリメントの記録が見つかりません。",
        status: 404,
      },
      { status: 404 },
    );
  }
  return NextResponse.json({ deleted: true });
}
