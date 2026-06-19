import { SocialPost } from "@/app/lib/types";

export type InstagramTokenResponse = {
  access_token: string;
  user_id: number | string;
  permissions?: string[] | string;
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

export type InstagramMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
  like_count?: number;
  comments_count?: number;
};

export function resolveInstagramRedirectUri(
  redirectUriOverride?: string
): string {
  const fromOverride = redirectUriOverride?.trim();
  if (fromOverride) return fromOverride;

  const fromEnv = process.env.INSTAGRAM_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;

  throw new Error("Missing INSTAGRAM_REDIRECT_URI");
}

export function getInstagramConfig(redirectUriOverride?: string) {
  const clientId =
    process.env.INSTAGRAM_CLIENT_ID || process.env.INSTAGRAM_APP_ID;
  const clientSecret =
    process.env.INSTAGRAM_CLIENT_SECRET || process.env.INSTAGRAM_APP_SECRET;

  if (!clientId) {
    throw new Error("Missing INSTAGRAM_CLIENT_ID or INSTAGRAM_APP_ID");
  }

  if (!clientSecret) {
    throw new Error("Missing INSTAGRAM_CLIENT_SECRET or INSTAGRAM_APP_SECRET");
  }

  return {
    clientId,
    clientSecret,
    redirectUri: resolveInstagramRedirectUri(redirectUriOverride)
  };
}

export function buildInstagramAuthorizeUrl(redirectUriOverride?: string): string {
  const { clientId, redirectUri } = getInstagramConfig(redirectUriOverride);

  const params = new URLSearchParams({
    force_reauth: "true",
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "instagram_business_basic",
      "instagram_business_manage_insights"
    ].join(",")
  });

  return "https://www.instagram.com/oauth/authorize?" + params.toString();
}

async function parseInstagramResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const text = await response.text();

  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(fallbackMessage + ": " + JSON.stringify(data));
  }

  return data as T;
}

export async function exchangeCodeForShortLivedToken(
  code: string,
  redirectUriOverride?: string
): Promise<InstagramTokenResponse> {
  const { clientId, clientSecret, redirectUri } =
    getInstagramConfig(redirectUriOverride);

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  return parseInstagramResponse<InstagramTokenResponse>(
    response,
    "Token exchange failed"
  );
}

export async function exchangeForLongLivedToken(
  shortLivedAccessToken: string
): Promise<InstagramLongLivedTokenResponse> {
  const { clientSecret } = getInstagramConfig();

  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: shortLivedAccessToken
  });

  const response = await fetch(
    "https://graph.instagram.com/access_token?" + params.toString(),
    {
      method: "GET",
      cache: "no-store"
    }
  );

  return parseInstagramResponse<InstagramLongLivedTokenResponse>(
    response,
    "Long-lived token exchange failed"
  );
}

export async function fetchInstagramProfile(
  accessToken: string
): Promise<InstagramProfile | null> {
  const params = new URLSearchParams({
    fields: [
      "id",
      "user_id",
      "username",
      "name",
      "account_type",
      "profile_picture_url",
      "followers_count",
      "follows_count",
      "media_count"
    ].join(","),
    access_token: accessToken
  });

  const response = await fetch(
    "https://graph.instagram.com/me?" + params.toString(),
    {
      method: "GET",
      cache: "no-store"
    }
  );

  if (!response.ok) return null;
  return response.json() as Promise<InstagramProfile>;
}

async function fetchMediaViews(
  mediaId: string,
  accessToken: string
): Promise<number> {
  const metricSets = [
    ["views"],
    ["impressions"],
    ["reach"],
    ["plays"]
  ];

  for (const metrics of metricSets) {
    const params = new URLSearchParams({
      metric: metrics.join(","),
      access_token: accessToken
    });

    try {
      const response = await fetch(
        `https://graph.instagram.com/${mediaId}/insights?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store"
        }
      );

      if (!response.ok) continue;

      const data = (await response.json()) as {
        data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
      };

      const firstMetric = data.data?.find((item) =>
        metrics.includes(item.name || "")
      );

      const value = firstMetric?.values?.[0]?.value;
      if (typeof value === "number" && Number.isFinite(value)) return value;
    } catch {
      continue;
    }
  }

  return 0;
}

function getTitleFromCaption(caption: string | undefined, fallback: string) {
  const clean = (caption || "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 80 ? clean.slice(0, 77) + "..." : clean;
}

export async function fetchInstagramMediaPosts(
  accessToken: string
): Promise<SocialPost[]> {
  const params = new URLSearchParams({
    fields: [
      "id",
      "caption",
      "media_type",
      "permalink",
      "timestamp",
      "username",
      "like_count",
      "comments_count"
    ].join(","),
    limit: "100",
    access_token: accessToken
  });

  const response = await fetch(
    "https://graph.instagram.com/me/media?" + params.toString(),
    {
      method: "GET",
      cache: "no-store"
    }
  );

  const data = await parseInstagramResponse<{
    data?: InstagramMediaItem[];
  }>(response, "Instagram media fetch failed");

  const media = data.data || [];

  return Promise.all(
    media.map(async (item): Promise<SocialPost> => {
      const views = await fetchMediaViews(item.id, accessToken);

      return {
        id: `instagram-${item.id}`,
        platform: "Instagram",
        title: getTitleFromCaption(item.caption, `Instagram media ${item.id}`),
        url: item.permalink || "https://www.instagram.com/",
        publishedAt: item.timestamp
          ? item.timestamp.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        views,
        likes: item.like_count || 0,
        comments: item.comments_count || 0,
        shares: 0,
        notes: item.caption || "",
        mediaType: item.media_type || "UNKNOWN"
      };
    })
  );
}
