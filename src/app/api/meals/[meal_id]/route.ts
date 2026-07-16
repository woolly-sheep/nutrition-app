// Thin HTTP entrypoint. Implementation lives in src/server/store.
// Never log meal contents here (logging allowlist).

import { NextResponse } from "next/server";
import { deleteMeal } from "../../../../server/store/mealStore";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ meal_id: string }> },
) {
  const { meal_id } = await params;
  const deleted = await deleteMeal(meal_id);
  if (!deleted) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "指定された記録が見つかりません。",
        status: 404,
      },
      { status: 404 },
    );
  }
  return NextResponse.json({ deleted: true });
}
