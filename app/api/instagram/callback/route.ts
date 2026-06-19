import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL("/", request.url);

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription =
    request.nextUrl.searchParams.get("error_description") ||
    request.nextUrl.searchParams.get("error_reason");

  if (code) url.searchParams.set("code", code);
  if (error) url.searchParams.set("error", error);
  if (errorDescription) {
    url.searchParams.set("error_description", errorDescription);
  }

  return NextResponse.redirect(url);
}
