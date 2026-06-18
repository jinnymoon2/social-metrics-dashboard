import { NextRequest, NextResponse } from "next/server";
import { buildInstagramAuthorizeUrl } from "@/app/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authorizeUrl = buildInstagramAuthorizeUrl();

    const debug = request.nextUrl.searchParams.get("debug");

    if (debug === "1") {
      return NextResponse.json({
        ok: true,
        authorizeUrl,
        redirectUri: process.env.INSTAGRAM_REDIRECT_URI || null,
        appId:
          process.env.INSTAGRAM_CLIENT_ID ||
          process.env.INSTAGRAM_APP_ID ||
          null,
      });
    }

    console.log("[instagram:connect] Redirecting to Instagram OAuth:", {
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
      appId:
        process.env.INSTAGRAM_CLIENT_ID ||
        process.env.INSTAGRAM_APP_ID ||
        null,
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Instagram OAuth error";

    console.error("[instagram:connect] Failed:", message);

    return NextResponse.json(
      {
        ok: false,
        error: message,
        env: {
          instagramAppIdExists: Boolean(
            process.env.INSTAGRAM_CLIENT_ID || process.env.INSTAGRAM_APP_ID
          ),
          instagramAppSecretExists: Boolean(
            process.env.INSTAGRAM_CLIENT_SECRET ||
              process.env.INSTAGRAM_APP_SECRET
          ),
          instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || null,
        },
      },
      {
        status: 500,
      }
    );
  }
}
