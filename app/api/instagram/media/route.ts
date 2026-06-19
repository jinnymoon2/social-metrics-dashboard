import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Walk the pagination cursor to the end so every post and reel is imported.
// MAX_PAGES is only a safety stop; normal accounts finish well before it.
const MAX_PAGES = 50;
const PAGE_SIZE = 100;
const GRAPH_BASE = "https://graph.instagram.com";

// Pulls "#tag" tokens out of a caption. Returns lowercase, deduplicated tags.
function extractHashtagsFromCaption(caption: string | undefined | null): string[] {
  if (!caption) return [];
  const matches = caption.match(/#([\p{L}\p{N}_]+)/gu) || [];
  const seen = new Set();
  const result = [];
  for (const match of matches) {
    const tag = match.slice(1).toLowerCase();
    if (!seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

// View count for one media item. Current Graph API versions expose a unified
// "views" metric; older versions use "impressions" for images/carousels. Try
// "views" first and fall back, so a deprecated metric never zeroes everything.
// Any failure resolves to 0 rather than aborting the whole import.
async function fetchMediaViews(mediaId: string, accessToken: string): Promise<number> {
  const metrics = ["views", "impressions"];
  for (const metric of metrics) {
    try {
      const url = new URL(GRAPH_BASE + "/" + mediaId + "/insights");
      url.searchParams.set("metric", metric);
      url.searchParams.set("access_token", accessToken);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const data = await response.json();
      const first = data.data && data.data[0];
      if (first) {
        if (first.values && first.values[0] && typeof first.values[0].value === "number") {
          return first.values[0].value;
        }
        if (first.total_value && typeof first.total_value.value === "number") {
          return first.total_value.value;
        }
      }
    } catch {
      // try the next metric
    }
  }
  return 0;
}

export async function GET(request: Request) {
  // The OAuth flow stores the token client-side, so the dashboard forwards it
  // in a header. Fall back to a cookie in case it is set server-side too.
  const headerToken = request.headers.get("x-instagram-access-token");
  const cookieStore = await cookies();
  const accessToken = headerToken || cookieStore.get("instagram_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Instagram is not connected yet." },
      { status: 401 }
    );
  }

  // Step 1: page through /me/media until there is no next cursor. Using "me"
  // means we only need the access token, not a separately-stored user id.
  const mediaItems = [];
  let after;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const listUrl = new URL(GRAPH_BASE + "/me/media");
    listUrl.searchParams.set(
      "fields",
      "id,caption,media_type,media_url,permalink,timestamp,username,like_count,comments_count,media_product_type,thumbnail_url"
    );
    listUrl.searchParams.set("access_token", accessToken);
    listUrl.searchParams.set("limit", String(PAGE_SIZE));
    if (after) listUrl.searchParams.set("after", after);

    const response = await fetch(listUrl, { cache: "no-store" });
    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        {
          error: "Failed to fetch Instagram media.",
          details,
          fetched: mediaItems.length
        },
        { status: 500 }
      );
    }

    const payload = await response.json();
    const data = (payload.data) || [];
    for (const item of data) mediaItems.push(item);

    after = payload.paging && payload.paging.cursors && payload.paging.cursors.after;
    if (!after) {
      break;
    }
  }

  // Step 2: fetch per-media view counts. Insights can 429 under a burst, so do
  // 5 at a time.
  const viewsByMediaId = new Map();
  const concurrency = 5;
  for (let i = 0; i < mediaItems.length; i += concurrency) {
    const slice = mediaItems.slice(i, i + concurrency);
    const results = await Promise.all(
      slice.map(async (item) => {
        const views = await fetchMediaViews(item.id, accessToken);
        return { id: item.id, views };
      })
    );
    for (const { id, views } of results) {
      viewsByMediaId.set(id, views);
    }
  }

  const posts = mediaItems.map((item) => {
    const caption = item.caption || "";
    const firstLine = caption.split("\n")[0] || "";
    // Reels report media_type "VIDEO"; the reel flag is in media_product_type.
    // Normalize to "REEL" so the posts/reels toggle can split them out.
    const isReel = item.media_product_type === "REELS";
    const mediaType = isReel ? "REEL" : (item.media_type || undefined);
    const title = firstLine.slice(0, 80) || ("Instagram " + (mediaType || "post"));
    return {
      id: "instagram-" + item.id,
      platform: "Instagram",
      title,
      url: item.permalink || "",
      publishedAt: item.timestamp ? item.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
      views: viewsByMediaId.get(item.id) || 0,
      likes: item.like_count || 0,
      comments: item.comments_count || 0,
      shares: 0,
      hashtags: extractHashtagsFromCaption(caption),
      notes: "Imported from Instagram. Type: " + (item.media_product_type || item.media_type || "unknown") + ".",
      mediaType
    };
  });

  return NextResponse.json({
    posts,
    fetchedAt: new Date().toISOString(),
    total: mediaItems.length
  });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;