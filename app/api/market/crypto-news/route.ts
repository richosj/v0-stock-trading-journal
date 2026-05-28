import { NextResponse } from "next/server"
import { requireAuthSession } from "@/lib/auth/server"
import { handleRouteError } from "@/lib/route-response"
import { fetchCryptoNews } from "@/lib/crypto-news"

export async function GET() {
  try {
    await requireAuthSession()
    const items = await fetchCryptoNews(40)
    return NextResponse.json({ items, fetchedAt: new Date().toISOString() })
  } catch (error) {
    return handleRouteError(error)
  }
}
