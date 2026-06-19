import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  InstagramMediaResponse,
  getInstagramConfig
} from "@/app/lib/instagram/config";

// Instagram returns at most ~25 posts per page; paginate with the "after"
// cursor until we hit the limit or Instagram signals there are no more pages.
// Cap at 100 so we do not hammer the API; the user can refresh to pick up new posts.
const MAX_PAGES = 5;
const PAGE_SIZE = 25;

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

// Fetches the impressions/views metric for one media item via the Instagram
// Graph API media-insights endpoint. The metric name varies by media type:
// reels and videos use "views", images and carousels use "impressions".
async function fetchMediaViews(mediaId: string, mediaType: string | undefined, graphBaseUrl: string, accessToken: string): Promise<number> {
  const isVideo = mediaType === "VIDEO" || mediaType === "REEL";
  const metric = isVideo ? "views" : "impressions";
  const url = new URL(graphBaseUrl + "/" + mediaId + "/insights");
  url.searchParams.set("metric", metric);
  url.searchParams.set("access_token", accessToken);
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return 0;
    const data = await response.json();
    const first = data.data && data.data[0];
    const value = first && first.values && first.values[0] && first.values[0].value;
    return typeof value === "number" ? value : 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("instagram_access_token")?.value;
  const userId = cookieStore.get("instagram_user_id")?.value;

  if (!accessToken || !userId) {
    return NextResponse.json(
      { error: "Instagram is not connected yet." },
      { status: 401 }
    );
  }

  const { graphBaseUrl } = getInstagramConfig();

  // Step 1: paginate the media list to get up to MAX_PAGES * PAGE_SIZE posts.
  const mediaItems = [];
  let after;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const listUrl = new URL(graphBaseUrl + "/" + userId + "/media");
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
    if (!after || data.length < PAGE_SIZE) {
      break;
    }
  }

  // Step 2: fetch per-media view counts in parallel. Insights endpoint can
  // 429 if we burst too hard, so do 5 at a time.
  const viewsByMediaId = new Map();
  const concurrency = 5;
  for (let i = 0; i < mediaItems.length; i += concurrency) {
    const slice = mediaItems.slice(i, i + concurrency);
    const results = await Promise.all(
      slice.map(async (item) => {
        const views = await fetchMediaViews(item.id, item.media_type, graphBaseUrl, accessToken);
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
    const title = firstLine.slice(0, 80) || ("Instagram " + (item.media_type || "post"));
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
      notes: "Imported from Instagram. Type: " + (item.media_type || "unknown") + ".",
      mediaType: item.media_type || undefined
    };
  });

  return NextResponse.json({
    posts,
    fetchedAt: new Date().toISOString(),
    total: mediaItems.length
  });
}
