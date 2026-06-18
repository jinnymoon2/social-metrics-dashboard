import { NextRequest, NextResponse } from "next/server";
import {
  InstagramTokenResponse,
  getInstagramConfig
} from "@/app/lib/instagram/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing Instagram authorization code." },
      { status: 400 }
    );
  }

  const { appId, appSecret, redirectUri, tokenUrl, appUrl } =
    getInstagramConfig();

  const formData = new URLSearchParams();
  formData.set("client_id", appId);
  formData.set("client_secret", appSecret);
  formData.set("grant_type", "authorization_code");
  formData.set("redirect_uri", redirectUri);
  formData.set("code", code);

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text();

    return NextResponse.json(
      {
        error: "Failed to exchange Instagram code for access token.",
        details
      },
      { status: 500 }
    );
  }

  const token = (await tokenResponse.json()) as InstagramTokenResponse;

  const response = NextResponse.redirect(`${appUrl}/?instagram=connected`);

  response.cookies.set("instagram_access_token", token.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  response.cookies.set("instagram_user_id", token.user_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
