import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type InstagramMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

async function graphGet(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params);

  const response = await fetch(
    `https://graph.instagram.com/${path}?${query.toString()}`,
    {
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error_message ||
        `Instagram API request failed: ${path}`,
    );
  }

  return data;
}

async function getMediaList(accessToken: string) {
  try {
    return await graphGet("me/media", {
      fields:
        "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count",
      limit: "50",
      access_token: accessToken,
    });
  } catch {
    return graphGet("me/media", {
      fields:
        "id,caption,media_type,permalink,timestamp,like_count,comments_count",
      limit: "50",
      access_token: accessToken,
    });
  }
}

async function getMediaInsights(mediaId: string, accessToken: string) {
  const metricSets = [
    "views,likes,comments,shares,saves,total_interactions",
    "plays,likes,comments,shares,saves,total_interactions",
  ];

  for (const metric of metricSets) {
    try {
      const data = await graphGet(`${mediaId}/insights`, {
        metric,
        access_token: accessToken,
      });

      const values: Record<string, number> = {};

      for (const item of data?.data ?? []) {
        values[item.name] = toNumber(item.values?.[0]?.value);
      }

      return values;
    } catch {
      continue;
    }
  }

  return {};
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("instagram_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        error: "Instagram is not connected.",
      },
      { status: 401 },
    );
  }

  try {
    const profile = await graphGet("me", {
      fields: "user_id,username,account_type,media_count",
      access_token: accessToken,
    });

    const mediaResponse = await getMediaList(accessToken);
    const media: InstagramMedia[] = mediaResponse?.data ?? [];

    const posts = await Promise.all(
      media.map(async (item) => {
        const insights = await getMediaInsights(item.id, accessToken);

        return {
          id: item.id,
          title: item.caption
            ? item.caption.slice(0, 90)
            : `${item.media_product_type ?? item.media_type ?? "Instagram"} post`,
          url: item.permalink,
          views: toNumber(insights.views ?? insights.plays),
          likes: toNumber(insights.likes ?? item.like_count),
          comments: toNumber(insights.comments ?? item.comments_count),
          shares: toNumber(insights.shares),
          saves: toNumber(insights.saves),
          createdAt: item.timestamp,
          mediaType: item.media_type,
          mediaProductType: item.media_product_type,
        };
      }),
    );

    const totalViews = posts.reduce((sum, post) => sum + toNumber(post.views), 0);
    const totalLikes = posts.reduce((sum, post) => sum + toNumber(post.likes), 0);
    const totalComments = posts.reduce((sum, post) => sum + toNumber(post.comments), 0);
    const totalShares = posts.reduce((sum, post) => sum + toNumber(post.shares), 0);
    const totalSaves = posts.reduce((sum, post) => sum + toNumber(post.saves), 0);

    const engagementRate =
      totalViews > 0
        ? ((totalLikes + totalComments + totalShares + totalSaves) / totalViews) * 100
        : 0;

    return NextResponse.json({
      ok: true,
      connected: true,
      platform: "instagram",
      username: profile.username,
      profileUrl: profile.username
        ? `https://www.instagram.com/${profile.username}`
        : undefined,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      postCount: toNumber(profile.media_count || posts.length),
      engagementRate,
      updatedAt: new Date().toISOString(),
      posts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        connected: true,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Instagram metrics.",
      },
      { status: 500 },
    );
  }
}
