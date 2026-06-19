import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  fetchInstagramProfile,
  resolveInstagramRedirectUri
} from "@/app/lib/instagram";

export const dynamic = "force-dynamic";

type ExchangeRequestBody = {
  code?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExchangeRequestBody;
    const rawCode = body.code;

    if (!rawCode) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Instagram authorization code"
        },
        {
          status: 400
        }
      );
    }

    const code = rawCode.replace(/#_/g, "").trim();

    // Use the redirect URI exactly as configured in INSTAGRAM_REDIRECT_URI.
    // Meta requires the same redirect URI used during authorization, so we must
    // not derive a different value from the incoming request URL.
    const redirectUri = resolveInstagramRedirectUri();

    console.log("[instagram:exchange] Received code:", {
      hasCode: Boolean(code),
      codeLength: code.length,
      redirectUri,
      envRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || null
    });

    const shortLivedToken = await exchangeCodeForShortLivedToken(
      code,
      redirectUri
    );

    console.log("[instagram:exchange] Short-lived token received:", {
      userId: shortLivedToken.user_id,
      hasAccessToken: Boolean(shortLivedToken.access_token)
    });

    let longLivedToken = null;
    let profile = null;

    try {
      longLivedToken = await exchangeForLongLivedToken(
        shortLivedToken.access_token
      );

      console.log("[instagram:exchange] Long-lived token received:", {
        hasAccessToken: Boolean(longLivedToken.access_token),
        expiresIn: longLivedToken.expires_in
      });

      profile = await fetchInstagramProfile(longLivedToken.access_token);

      console.log("[instagram:exchange] Profile received:", {
        username: (profile && profile.username) || null,
        accountType: (profile && profile.account_type) || null
      });
    } catch (error) {
      console.error("[instagram:exchange] Long-lived/profile step failed:", error);
    }

    // Pick the longest-lived token we have so /api/instagram/media can keep
    // calling Graph for the full ~60 days. Cookies are httpOnly so they are
    // not exposed to JS, but readable by the server route handlers.
    const accessToken = (longLivedToken && longLivedToken.access_token) || shortLivedToken.access_token;
    const maxAge = ((longLivedToken && longLivedToken.expires_in) || 60 * 60 * 24 * 30);

    const response = NextResponse.json({
      ok: true,
      connection: {
        userId: shortLivedToken.user_id,
        permissions: shortLivedToken.permissions || [],
        shortLivedAccessToken: shortLivedToken.access_token,
        longLivedAccessToken: (longLivedToken && longLivedToken.access_token) || null,
        tokenType: (longLivedToken && longLivedToken.token_type) || null,
        expiresIn: (longLivedToken && longLivedToken.expires_in) || null,
        profile
      }
    });

    const secure = (request.nextUrl.protocol === "https:");
    response.cookies.set("instagram_access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge
    });
    response.cookies.set("instagram_user_id", String(shortLivedToken.user_id), {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Instagram token error";

    console.error("[instagram:exchange] Token exchange failed:", message);

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      {
        status: 500
      }
    );
  }
}
