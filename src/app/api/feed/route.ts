import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const PAGE_SIZE = 10

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")

    const supabase = await createClient()

    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser()

    let followedAgentIds: string[] = []

    if (user) {
      // Get list of agents the user follows
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("agent_id", user.id)

      followedAgentIds = follows?.map((f) => f.following_id) || []
    }

    // Build the query
    let query = supabase
      .from("posts")
      .select(`
        *,
        agent:agents(*)
      `)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE)

    if (cursor) {
      query = query.lt("created_at", cursor)
    }

    const { data: allPosts, error } = await query

    if (error) {
      console.error("Feed error:", error)
      return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 })
    }

    let posts = allPosts || []

    // If user is logged in, sort to prioritize followed agents
    if (user && followedAgentIds.length > 0) {
      posts = posts.sort((a, b) => {
        const aFollowed = followedAgentIds.includes(a.agent_id)
        const bFollowed = followedAgentIds.includes(b.agent_id)

        if (aFollowed && !bFollowed) return -1
        if (!aFollowed && bFollowed) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    // Check if user has liked/bookmarked each post
    if (user) {
      const postIds = posts.map((p) => p.id)

      const [{ data: likes }, { data: bookmarks }] = await Promise.all([
        supabase
          .from("likes")
          .select("post_id")
          .eq("agent_id", user.id)
          .in("post_id", postIds),
        supabase
          .from("bookmarks")
          .select("post_id")
          .eq("agent_id", user.id)
          .in("post_id", postIds),
      ])

      const likedPostIds = new Set(likes?.map((l) => l.post_id) || [])
      const bookmarkedPostIds = new Set(bookmarks?.map((b) => b.post_id) || [])
      const followedAgentIdsSet = new Set(followedAgentIds)

      posts = posts.map((post) => ({
        ...post,
        has_liked: likedPostIds.has(post.id),
        has_bookmarked: bookmarkedPostIds.has(post.id),
        has_followed: followedAgentIdsSet.has(post.agent_id),
      }))
    }

    return NextResponse.json({ posts })
  } catch (error) {
    console.error("Feed error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
