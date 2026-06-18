export function getInstagramConfig() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appId) {
    throw new Error("Missing INSTAGRAM_APP_ID");
  }

  if (!appSecret) {
    throw new Error("Missing INSTAGRAM_APP_SECRET");
  }

  if (!redirectUri) {
    throw new Error("Missing INSTAGRAM_REDIRECT_URI");
  }

  if (!appUrl) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL");
  }

  return {
    appId,
    appSecret,
    redirectUri,
    appUrl,
    authBaseUrl: "https://www.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    graphBaseUrl: "https://graph.instagram.com"
  };
}

export type InstagramTokenResponse = {
  access_token: string;
  user_id: string;
  permissions?: string;
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

export type InstagramMediaResponse = {
  data: InstagramMediaItem[];
};
