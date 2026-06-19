import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("instagram_access_token")?.value;
  const userId = cookieStore.get("instagram_user_id")?.value;

  return NextResponse.json({
    connected: Boolean(accessToken && userId),
    userId: userId || null
  });
}
