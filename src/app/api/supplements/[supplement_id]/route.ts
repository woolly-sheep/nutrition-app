// Thin HTTP entrypoint. Never log supplement contents here (logging allowlist).

import { NextResponse } from "next/server";
import { updateSupplement } from "../../../../server/api/handlers/updateSupplement";
import { deleteSupplement } from "../../../../server/store/supplementStore";

type RouteContext = { params: Promise<{ supplement_id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const { supplement_id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const result = await updateSupplement(supplement_id, body);

  if (!result.ok) {
    return NextResponse.json(result.problem, {
      status: result.problem.status,
    });
  }
  return NextResponse.json({ supplement: result.supplement });
}

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
