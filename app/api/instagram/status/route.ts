import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("instagram_access_token")?.value;
  const userId = request.cookies.get("instagram_user_id")?.value;

  return NextResponse.json({
    ok: true,
    connected: Boolean(accessToken && userId),
    userId: userId ?? null,
  });
}
