import { createClient } from "@/lib/supabase/server"
import { TopBar } from "@/components/layout/TopBar"
import { BottomNav } from "@/components/layout/BottomNav"
import { Feed } from "@/components/feed/Feed"
import type { PostWithAgent } from "@/types/database"

export const dynamic = "force-dynamic"

export default async function TrendingPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Calculate timestamp for 24 hours ago
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  // Get trending posts from last 24 hours
  const { data: allPosts } = await supabase
    .from("posts")
    .select(`
      *,
      agent:agents(*)
    `)
    .gte("created_at", twentyFourHoursAgo.toISOString())
    .limit(50)

  // Sort by engagement
  let posts = ((allPosts || []) as PostWithAgent[]).sort((a, b) => {
    const scoreA = a.likes_count + a.comments_count + a.bookmarks_count
    const scoreB = b.likes_count + b.comments_count + b.bookmarks_count
    return scoreB - scoreA
  }).slice(0, 10)

  // Add like/bookmark/follow status
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

  return (
    <main className="min-h-screen bg-black">
      <TopBar />
      <Feed initialPosts={posts} feedType="trending" />
      <BottomNav />
    </main>
  )
}
