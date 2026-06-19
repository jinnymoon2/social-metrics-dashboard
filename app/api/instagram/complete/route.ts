import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function getRedirectUri() {
  return (
    process.env.INSTAGRAM_REDIRECT_URI ||
    `${getAppUrl()}/api/instagram/callback`
  );
}

async function exchangeCodeForShortLivedToken(code: string) {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing INSTAGRAM_CLIENT_ID or INSTAGRAM_CLIENT_SECRET.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
    code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error_message ||
        data?.error?.message ||
        "Failed to exchange Instagram authorization code.",
    );
  }

  return data as {
    access_token: string;
    user_id: number | string;
    permissions?: string[];
  };
}

async function exchangeForLongLivedToken(shortLivedToken: string) {
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

  if (!clientSecret) {
    throw new Error("Missing INSTAGRAM_CLIENT_SECRET.");
  }

  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return {
      access_token: shortLivedToken,
      token_type: "bearer",
      expires_in: 60 * 60,
    };
  }

  return data as {
    access_token: string;
    token_type?: string;
    expires_in?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const code = body.code;
    const incomingState = body.state;
    const storedState = request.cookies.get("instagram_oauth_state")?.value;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Instagram authorization code.",
        },
        { status: 400 },
      );
    }

    if (
      !incomingState ||
      typeof incomingState !== "string" ||
      !storedState ||
      incomingState !== storedState
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid Instagram login state. Please try again.",
        },
        { status: 400 },
      );
    }

    const shortLived = await exchangeCodeForShortLivedToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    const response = NextResponse.json({
      ok: true,
      connected: true,
      userId: String(shortLived.user_id),
    });

    response.cookies.delete("instagram_oauth_state");

    response.cookies.set("instagram_access_token", longLived.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: longLived.expires_in ?? 60 * 60 * 24 * 60,
    });

    response.cookies.set("instagram_user_id", String(shortLived.user_id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: longLived.expires_in ?? 60 * 60 * 24 * 60,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Instagram login failed.",
      },
      { status: 500 },
    );
  }
}
