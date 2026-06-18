export type InstagramTokenResponse = {
  access_token: string;
  user_id: number;
  permissions?: string[];
};

export type InstagramLongLivedTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type InstagramProfile = {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
};

export function getInstagramConfig() {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  if (!clientId) {
    throw new Error("Missing INSTAGRAM_CLIENT_ID");
  }

  if (!clientSecret) {
    throw new Error("Missing INSTAGRAM_CLIENT_SECRET");
  }

  if (!redirectUri) {
    throw new Error("Missing INSTAGRAM_REDIRECT_URI");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function buildInstagramAuthorizeUrl() {
  const { clientId, redirectUri } = getInstagramConfig();

  const params = new URLSearchParams({
    force_reauth: "true",
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "instagram_business_basic",
      "instagram_business_manage_insights",
    ].join(","),
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForShortLivedToken(
  code: string
): Promise<InstagramTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getInstagramConfig();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  }

  return data as InstagramTokenResponse;
}

export async function exchangeForLongLivedToken(
  shortLivedAccessToken: string
): Promise<InstagramLongLivedTokenResponse> {
  const { clientSecret } = getInstagramConfig();

  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: shortLivedAccessToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Long-lived token exchange failed: ${JSON.stringify(data)}`);
  }

  return data as InstagramLongLivedTokenResponse;
}

export async function fetchInstagramProfile(
  accessToken: string
): Promise<InstagramProfile | null> {
  const fields = [
    "id",
    "user_id",
    "username",
    "name",
    "account_type",
    "profile_picture_url",
    "followers_count",
    "follows_count",
    "media_count",
  ].join(",");

  const params = new URLSearchParams({
    fields,
    access_token: accessToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/me?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Instagram profile fetch failed:", data);
    return null;
  }

  return data as InstagramProfile;
}
