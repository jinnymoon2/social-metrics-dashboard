import { NextRequest, NextResponse } from "next/server";
import {
  buildInstagramAuthorizeUrl,
  resolveInstagramRedirectUri
} from "@/app/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const redirectUri = resolveInstagramRedirectUri();
    const authorizeUrl = buildInstagramAuthorizeUrl(redirectUri);
    const debug = request.nextUrl.searchParams.get("debug");

    if (debug === "1") {
      return NextResponse.json({
        ok: true,
        authorizeUrl,
        redirectUri,
        envRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || null,
        appId:
          process.env.INSTAGRAM_CLIENT_ID ||
          process.env.INSTAGRAM_APP_ID ||
          null
      });
    }

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Instagram OAuth error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        env: {
          hasClientId: Boolean(
            process.env.INSTAGRAM_CLIENT_ID || process.env.INSTAGRAM_APP_ID
          ),
          hasClientSecret: Boolean(
            process.env.INSTAGRAM_CLIENT_SECRET ||
              process.env.INSTAGRAM_APP_SECRET
          ),
          redirectUri: process.env.INSTAGRAM_REDIRECT_URI || null
        }
      },
      { status: 500 }
    );
  }
}
