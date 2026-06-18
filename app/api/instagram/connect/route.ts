import { NextResponse } from "next/server";
import { buildInstagramAuthorizeUrl } from "@/app/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authorizeUrl = buildInstagramAuthorizeUrl();

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Instagram OAuth error";

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
