import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  InstagramMediaResponse,
  getInstagramConfig
} from "@/app/lib/instagram/config";

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

  const url = new URL(`${graphBaseUrl}/${userId}/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,permalink,timestamp,username,like_count,comments_count"
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await response.text();

    return NextResponse.json(
      {
        error: "Failed to fetch Instagram media.",
        details
      },
      { status: 500 }
    );
  }

  const media = (await response.json()) as InstagramMediaResponse;

  const posts = media.data.map((item) => ({
    id: `instagram-${item.id}`,
    platform: "Instagram",
    title: item.caption?.slice(0, 80) || "Instagram post",
    url: item.permalink || "",
    publishedAt:
      item.timestamp?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    views: 0,
    likes: item.like_count || 0,
    comments: item.comments_count || 0,
    shares: 0,
    notes: `Imported from Instagram. Media type: ${item.media_type || "unknown"}`
  }));

  return NextResponse.json({ posts });
}
