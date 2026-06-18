import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  fetchInstagramProfile,
} from "@/app/lib/instagram";

export const dynamic = "force-dynamic";

type ExchangeRequestBody = {
  code?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExchangeRequestBody;
    const code = body.code;

    if (!code) {
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

    const shortLivedToken = await exchangeCodeForShortLivedToken(code);

    let longLivedToken = null;
    let profile = null;

    try {
      longLivedToken = await exchangeForLongLivedToken(
        shortLivedToken.access_token
      );

      profile = await fetchInstagramProfile(longLivedToken.access_token);
    } catch (error) {
      console.error("Instagram long-lived token/profile step failed:", error);
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
