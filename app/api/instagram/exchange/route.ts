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

function normalizePermissions(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").filter(Boolean);
  return [];
}

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
        { status: 400 }
      );
    }

    const code = rawCode.replace(/#_/g, "").trim();
    const redirectUri = resolveInstagramRedirectUri();

    const shortLivedToken = await exchangeCodeForShortLivedToken(
      code,
      redirectUri
    );

    let longLivedToken = null;
    let profile = null;

    try {
      longLivedToken = await exchangeForLongLivedToken(
        shortLivedToken.access_token
      );
      profile = await fetchInstagramProfile(longLivedToken.access_token);
    } catch {
      profile = await fetchInstagramProfile(shortLivedToken.access_token);
    }

    const accessToken =
      longLivedToken?.access_token || shortLivedToken.access_token;
    const maxAge = longLivedToken?.expires_in || 60 * 60 * 24 * 30;
    const userId = String(shortLivedToken.user_id);

    const response = NextResponse.json({
      ok: true,
      connection: {
        userId,
        permissions: normalizePermissions(shortLivedToken.permissions),
        tokenType: longLivedToken?.token_type || null,
        expiresIn: longLivedToken?.expires_in || null,
        profile
      }
    });

    const secure = request.nextUrl.protocol === "https:";

    response.cookies.set("instagram_access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge
    });

    response.cookies.set("instagram_user_id", userId, {
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

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}
