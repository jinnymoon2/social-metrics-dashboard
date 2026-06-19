import { NextRequest, NextResponse } from "next/server";
import {
  buildInstagramAuthorizeUrl,
  resolveInstagramRedirectUri
} from "@/app/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Use the redirect URI exactly as configured in INSTAGRAM_REDIRECT_URI.
    // Meta requires an exact match with the URI registered for the app, so we
    // never strip the trailing slash or replace it with the request origin.
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

    console.log("[instagram:connect] Redirecting to Instagram OAuth:", {
      redirectUri,
      envRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || null,
      appId:
        process.env.INSTAGRAM_CLIENT_ID ||
        process.env.INSTAGRAM_APP_ID ||
        null
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
          instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || null
        }
      },
      {
        status: 500
      }
    );
  }
}
