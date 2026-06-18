import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const instagramClientId =
    process.env.INSTAGRAM_CLIENT_ID || process.env.INSTAGRAM_APP_ID || null;

  const instagramClientSecret =
    process.env.INSTAGRAM_CLIENT_SECRET ||
    process.env.INSTAGRAM_APP_SECRET ||
    null;

  return NextResponse.json({
    ok: true,
    instagramClientIdExists: Boolean(instagramClientId),
    instagramClientId,
    instagramClientSecretExists: Boolean(instagramClientSecret),
    instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || null,
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    rawVariableNames: {
      INSTAGRAM_CLIENT_ID: Boolean(process.env.INSTAGRAM_CLIENT_ID),
      INSTAGRAM_APP_ID: Boolean(process.env.INSTAGRAM_APP_ID),
      INSTAGRAM_CLIENT_SECRET: Boolean(process.env.INSTAGRAM_CLIENT_SECRET),
      INSTAGRAM_APP_SECRET: Boolean(process.env.INSTAGRAM_APP_SECRET),
    },
  });
}
