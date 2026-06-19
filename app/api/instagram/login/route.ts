import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getRedirectUri() {
  return (
    process.env.INSTAGRAM_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`
  );
}

export async function GET() {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing INSTAGRAM_CLIENT_ID in .env.local.",
      },
      { status: 500 },
    );
  }

  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    force_reauth: "true",
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: [
      "instagram_business_basic",
      "instagram_business_manage_insights",
    ].join(","),
    state,
  });

  const response = NextResponse.redirect(
    `https://www.instagram.com/oauth/authorize?${params.toString()}`,
  );

  response.cookies.set("instagram_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
