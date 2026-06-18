import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  fetchInstagramProfile,
  normalizeInstagramRedirectUri,
} from "@/app/lib/instagram";

export const dynamic = "force-dynamic";

type ExchangeRequestBody = {
  code?: string;
};

function getRuntimeRedirectUri(request: NextRequest) {
  return normalizeInstagramRedirectUri(new URL("/", request.url).toString());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExchangeRequestBody;
    const rawCode = body.code;

    if (!rawCode) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Instagram authorization code",
        },
        {
          status: 400,
        }
      );
    }

    const code = rawCode.replace("#_", "").trim();
    const redirectUri = getRuntimeRedirectUri(request);

    console.log("[instagram:exchange] Received code:", {
      hasCode: Boolean(code),
      codeLength: code.length,
      redirectUri,
      envRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || null,
      normalizedEnvRedirectUri: process.env.INSTAGRAM_REDIRECT_URI
        ? normalizeInstagramRedirectUri(process.env.INSTAGRAM_REDIRECT_URI)
        : null,
    });

    const shortLivedToken = await exchangeCodeForShortLivedToken(
      code,
      redirectUri
    );

    console.log("[instagram:exchange] Short-lived token received:", {
      userId: shortLivedToken.user_id,
      hasAccessToken: Boolean(shortLivedToken.access_token),
    });

    let longLivedToken = null;
    let profile = null;

    try {
      longLivedToken = await exchangeForLongLivedToken(
        shortLivedToken.access_token
      );

      console.log("[instagram:exchange] Long-lived token received:", {
        hasAccessToken: Boolean(longLivedToken.access_token),
        expiresIn: longLivedToken.expires_in,
      });

      profile = await fetchInstagramProfile(longLivedToken.access_token);

      console.log("[instagram:exchange] Profile received:", {
        username: profile?.username ?? null,
        accountType: profile?.account_type ?? null,
      });
    } catch (error) {
      console.error("[instagram:exchange] Long-lived/profile step failed:", error);
    }

    return NextResponse.json({
      ok: true,
      connection: {
        userId: shortLivedToken.user_id,
        permissions: shortLivedToken.permissions ?? [],
        shortLivedAccessToken: shortLivedToken.access_token,
        longLivedAccessToken: longLivedToken?.access_token ?? null,
        tokenType: longLivedToken?.token_type ?? null,
        expiresIn: longLivedToken?.expires_in ?? null,
        profile,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Instagram token error";

    console.error("[instagram:exchange] Token exchange failed:", message);

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
