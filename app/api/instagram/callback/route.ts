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

function popupHtml(status: "success" | "error", message: string) {
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Instagram Login</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f7fb;
        color: #111827;
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
      }

      .card {
        width: min(420px, calc(100vw - 32px));
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
        text-align: center;
      }

      h1 {
        margin: 0;
        font-size: 22px;
      }

      p {
        color: #6b7280;
        line-height: 1.6;
      }

      a {
        color: #111827;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${status === "success" ? "Instagram connected" : "Instagram login failed"}</h1>
      <p>${message}</p>
      <p>If this window does not close automatically, you can close it manually.</p>
      <a href="${getAppUrl()}">Back to dashboard</a>
    </div>

    <script>
      if (window.opener) {
        window.opener.postMessage(
          {
            source: "social-metrics-dashboard",
            provider: "instagram",
            status: "${status}",
            message: ${JSON.stringify(message)}
          },
          "${getAppUrl()}"
        );

        setTimeout(function () {
          window.close();
        }, 600);
      } else {
        setTimeout(function () {
          window.location.href = "${getAppUrl()}";
        }, 1200);
      }
    </script>
  </body>
</html>
`;
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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const incomingState = url.searchParams.get("state");
  const storedState = request.cookies.get("instagram_oauth_state")?.value;

  if (!code) {
    return new NextResponse(
      popupHtml("error", "Instagram did not return an authorization code."),
      {
        status: 400,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      },
    );
  }

  if (!incomingState || !storedState || incomingState !== storedState) {
    return new NextResponse(
      popupHtml("error", "Invalid Instagram login state. Please try again."),
      {
        status: 400,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      },
    );
  }

  try {
    const shortLived = await exchangeCodeForShortLivedToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    const response = new NextResponse(
      popupHtml("success", "Your Instagram account is connected. Loading metrics now."),
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      },
    );

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
    return new NextResponse(
      popupHtml(
        "error",
        error instanceof Error ? error.message : "Instagram login failed.",
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      },
    );
  }
}
