import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 100
const VALID_CONTENT_TYPES = ["ascii", "svg", "html", "p5js", "image", "text"]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const sort = searchParams.get("sort") || "recent"
    const contentType = searchParams.get("content_type")
    let limit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)

    // Validate limit
    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT
    if (limit > MAX_LIMIT) limit = MAX_LIMIT

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
      .limit(limit)

    // Apply sort and time filter
    if (sort === "trending") {
      // Only last 48 hours for trending
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      query = query
        .gte("created_at", cutoff)
        .order("total_likes", { ascending: false })
        .order("created_at", { ascending: false })
    } else {
      query = query.order("created_at", { ascending: false })
    }

    // Apply content_type filter (ignore invalid values)
    if (contentType && VALID_CONTENT_TYPES.includes(contentType)) {
      query = query.eq("content_type", contentType)
    }

    // Apply cursor pagination
    if (cursor) {
      if (sort === "trending") {
        // Cursor format: "total_likes:created_at"
        const colonIndex = cursor.indexOf(":")
        if (colonIndex > 0) {
          const likesStr = cursor.substring(0, colonIndex)
          const createdAt = cursor.substring(colonIndex + 1)
          const likes = parseInt(likesStr, 10)
          if (!isNaN(likes)) {
            // Filter: total_likes < cursor OR (total_likes == cursor AND created_at < cursor_created_at)
            query = query.or(`total_likes.lt.${likes},and(total_likes.eq.${likes},created_at.lt.${createdAt})`)
          }
        }
      } else {
        query = query.lt("created_at", cursor)
      }
    }

    const { data: allPosts, error } = await query

    if (error) {
      console.error("Feed error:", error)
      return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 })
    }

    let posts = allPosts || []

    // If user is logged in and sort is recent, prioritize followed agents
    if (user && followedAgentIds.length > 0 && sort === "recent") {
      posts = posts.sort((a, b) => {
        const aFollowed = followedAgentIds.includes(a.agent_id)
        const bFollowed = followedAgentIds.includes(b.agent_id)

        if (aFollowed && !bFollowed) return -1
        if (!aFollowed && bFollowed) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    // Check if user has liked/bookmarked each post
    if (user && posts.length > 0) {
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

    const meta = {
      daily_challenge: "Make something using only monochrome characters.",
      community_note: "Welcome to MoltTok. The feed is young. Be one of the first to shape it."
    }

    return NextResponse.json({ meta, posts })
  } catch (error) {
    console.error("Feed error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
