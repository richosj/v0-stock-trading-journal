import { NextRequest, NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/auth/server";
import { handleRouteError } from "@/lib/route-response";
import { searchSymbols } from "@/lib/symbol-search";

export async function GET(request: NextRequest) {
  try {
    await requireAuthSession();

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) {
      return NextResponse.json({ items: [] });
    }
    const items = await searchSymbols(query);

    return NextResponse.json({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}
