import { NextRequest, NextResponse } from "next/server";

type InstagramTokenResponse = {
  access_token: string;
  user_id: string;
  permissions?: string;
};

export async function middleware(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  if (error || errorDescription) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set(
      "instagram_error",
      errorDescription || error || "Instagram authorization failed."
    );

    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.next();
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appId || !appSecret || !redirectUri || !appUrl) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set(
      "instagram_error",
      "Missing Instagram environment variables."
    );

    return NextResponse.redirect(redirectUrl);
  }

  const formData = new URLSearchParams();
  formData.set("client_id", appId);
  formData.set("client_secret", appSecret);
  formData.set("grant_type", "authorization_code");
  formData.set("redirect_uri", redirectUri);
  formData.set("code", code);

  try {
    const tokenResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    if (!tokenResponse.ok) {
      const details = await tokenResponse.text();
      const redirectUrl = new URL("/", request.url);
      redirectUrl.searchParams.set(
        "instagram_error",
        `Token exchange failed: ${details}`
      );

      return NextResponse.redirect(redirectUrl);
    }

    const token = (await tokenResponse.json()) as InstagramTokenResponse;

    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("instagram", "connected");

    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set("instagram_access_token", token.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: appUrl.startsWith("https://"),
      path: "/",
      maxAge: 60 * 60
    });

    response.cookies.set("instagram_user_id", token.user_id, {
      httpOnly: true,
      sameSite: "lax",
      secure: appUrl.startsWith("https://"),
      path: "/",
      maxAge: 60 * 60
    });

    return response;
  } catch {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set(
      "instagram_error",
      "Unexpected Instagram token exchange error."
    );

    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: "/"
};
