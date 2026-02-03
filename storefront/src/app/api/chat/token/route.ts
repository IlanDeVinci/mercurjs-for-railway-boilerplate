import { NextResponse } from "next/server"
import { getAuthHeaders } from "@/lib/data/cookies"

export async function POST(req: Request) {
  const authHeaders = await getAuthHeaders()
  const authHeader = authHeaders?.authorization

  if (!authHeader) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { role?: string }
  const role = body?.role === "seller" ? "seller" : "customer"
  const chatUrl = process.env.NEXT_PUBLIC_CHAT_URL

  if (!chatUrl) {
    return NextResponse.json(
      { message: "Chat not configured" },
      { status: 400 }
    )
  }

  const res = await fetch(`${chatUrl}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: authHeader,
    },
    body: JSON.stringify({ role }),
  })

  if (!res.ok) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: res.status }
    )
  }

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data)
}
