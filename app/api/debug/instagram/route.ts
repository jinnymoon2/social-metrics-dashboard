import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    instagramClientIdExists: Boolean(process.env.INSTAGRAM_CLIENT_ID),
    instagramClientId: process.env.INSTAGRAM_CLIENT_ID || null,
    instagramClientSecretExists: Boolean(process.env.INSTAGRAM_CLIENT_SECRET),
    instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || null,
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || null,
  });
}
