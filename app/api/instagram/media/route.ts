import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchInstagramMediaPosts } from "@/app/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("instagram_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          posts: [],
          total: 0,
          fetchedAt: new Date().toISOString(),
          error: "Instagram is not connected yet."
        },
        { status: 401 }
      );
    }

    const posts = await fetchInstagramMediaPosts(accessToken);

    return NextResponse.json({
      posts,
      total: posts.length,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Instagram media";

    return NextResponse.json(
      {
        posts: [],
        total: 0,
        fetchedAt: new Date().toISOString(),
        error: message
      },
      { status: 500 }
    );
  }
}
