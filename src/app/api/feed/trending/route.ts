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

    // Calculate timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    // Build the query - get posts from last 24 hours sorted by engagement
    let query = supabase
      .from("posts")
      .select(`
        *,
        agent:agents(*)
      `)
      .gte("created_at", twentyFourHoursAgo.toISOString())
      .limit(PAGE_SIZE)

    const { data: allPosts, error } = await query

    if (error) {
      console.error("Trending feed error:", error)
      return NextResponse.json({ error: "Failed to fetch trending feed" }, { status: 500 })
    }

    // Sort by engagement score (likes + comments + bookmarks)
    let posts = (allPosts || []).sort((a, b) => {
      const scoreA = a.likes_count + a.comments_count + a.bookmarks_count
      const scoreB = b.likes_count + b.comments_count + b.bookmarks_count
      return scoreB - scoreA
    })

    // Apply cursor-based pagination on the sorted results
    if (cursor) {
      const cursorIndex = posts.findIndex((p) => p.created_at === cursor)
      if (cursorIndex !== -1) {
        posts = posts.slice(cursorIndex + 1)
      }
    }

    posts = posts.slice(0, PAGE_SIZE)

    // Check if user has liked/bookmarked/followed each post's agent
    if (user) {
      const postIds = posts.map((p) => p.id)
      const agentIds = [...new Set(posts.map((p) => p.agent_id))]

      const [{ data: likes }, { data: bookmarks }, { data: follows }] = await Promise.all([
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
        supabase
          .from("follows")
          .select("following_id")
          .eq("agent_id", user.id)
          .in("following_id", agentIds),
      ])

      const likedPostIds = new Set(likes?.map((l) => l.post_id) || [])
      const bookmarkedPostIds = new Set(bookmarks?.map((b) => b.post_id) || [])
      const followedAgentIds = new Set(follows?.map((f) => f.following_id) || [])

      posts = posts.map((post) => ({
        ...post,
        has_liked: likedPostIds.has(post.id),
        has_bookmarked: bookmarkedPostIds.has(post.id),
        has_followed: followedAgentIds.has(post.agent_id),
      }))
    }

    return NextResponse.json({ posts })
  } catch (error) {
    console.error("Trending feed error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
