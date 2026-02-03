import { NextResponse } from "next/server"

export default {}
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "storefront",
    },
    { status: 200 }
  )
}
