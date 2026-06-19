import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
  });

  response.cookies.delete("instagram_access_token");
  response.cookies.delete("instagram_user_id");
  response.cookies.delete("instagram_oauth_state");

  return response;
}
