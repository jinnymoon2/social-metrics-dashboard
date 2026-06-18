import { NextRequest, NextResponse } from "next/server";
import {
  buildInstagramAuthorizeUrl,
  normalizeInstagramRedirectUri,
} from "@/app/lib/instagram";

export const dynamic = "force-dynamic";

function getRuntimeRedirectUri(request: NextRequest) {
  return normalizeInstagramRedirectUri(new URL("/", request.url).toString());
}

export async function GET(request: NextRequest) {
  try {
    const redirectUri = getRuntimeRedirectUri(request);
    const authorizeUrl = buildInstagramAuthorizeUrl(redirectUri);

    const debug = request.nextUrl.searchParams.get("debug");

    if (debug === "1") {
      return NextResponse.json({
        ok: true,
        authorizeUrl,
        redirectUri,
        envRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || null,
        normalizedEnvRedirectUri: process.env.INSTAGRAM_REDIRECT_URI
          ? normalizeInstagramRedirectUri(process.env.INSTAGRAM_REDIRECT_URI)
          : null,
        appId:
          process.env.INSTAGRAM_CLIENT_ID ||
          process.env.INSTAGRAM_APP_ID ||
          null,
      });
    }

    console.log("[instagram:connect] Redirecting to Instagram OAuth:", {
      redirectUri,
      envRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || null,
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
