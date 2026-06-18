import { NextResponse } from "next/server";
import { buildInstagramAuthorizeUrl } from "@/app/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authorizeUrl = buildInstagramAuthorizeUrl();

    console.log("[instagram:connect] Redirecting to Instagram OAuth:", {
      authorizeUrl,
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
      clientId: process.env.INSTAGRAM_CLIENT_ID,
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
          instagramClientIdExists: Boolean(process.env.INSTAGRAM_CLIENT_ID),
          instagramClientSecretExists: Boolean(
            process.env.INSTAGRAM_CLIENT_SECRET
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
