import { NextResponse } from "next/server";
import { getInstagramConfig } from "@/app/lib/instagram/config";

export async function GET() {
  const { appId, redirectUri, authBaseUrl } = getInstagramConfig();

  const scopes = [
    "instagram_business_basic",
    "instagram_business_manage_insights"
  ];

  const url = new URL(authBaseUrl);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes.join(","));
  url.searchParams.set("response_type", "code");

  return NextResponse.redirect(url);
}
