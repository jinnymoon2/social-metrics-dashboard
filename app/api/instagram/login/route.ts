import { NextRequest, NextResponse } from "next/server";
import { getInstagramConfig } from "@/app/lib/instagram/config";

export async function GET(request: NextRequest) {
  try {
    const { appId, redirectUri, authBaseUrl } = getInstagramConfig();

    const scopes = [
      "instagram_business_basic",
      "instagram_business_manage_insights"
    ];

    const url = new URL(authBaseUrl);
    url.searchParams.set("force_reauth", "true");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(","));

    const isDebug = request.nextUrl.searchParams.get("debug") === "1";

    if (isDebug) {
      return NextResponse.json({
        appId,
        redirectUri,
        scopes,
        authUrl: url.toString()
      });
    }

    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create Instagram login URL.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
