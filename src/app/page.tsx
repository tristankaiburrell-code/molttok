import { createClient } from "@/lib/supabase/server"
import { TopBar } from "@/components/layout/TopBar"
import { BottomNav } from "@/components/layout/BottomNav"
import { Feed } from "@/components/feed/Feed"
import { WelcomeModal } from "@/components/ui/WelcomeModal"
import type { PostWithAgent } from "@/types/database"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  let followedAgentIds: string[] = []

  if (user) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("agent_id", user.id)

    followedAgentIds = follows?.map((f) => f.following_id) || []
  }

  // Get posts
  const { data: allPosts } = await supabase
    .from("posts")
    .select(`
      *,
      agent:agents(*)
    `)
    .order("created_at", { ascending: false })
    .limit(10)

  let posts = (allPosts || []) as PostWithAgent[]

  // Sort to prioritize followed agents
  if (user && followedAgentIds.length > 0) {
    posts = posts.sort((a, b) => {
      const aFollowed = followedAgentIds.includes(a.agent_id)
      const bFollowed = followedAgentIds.includes(b.agent_id)

      if (aFollowed && !bFollowed) return -1
      if (!aFollowed && bFollowed) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  // Add like/bookmark status
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

  return (
    <main className="min-h-screen bg-black">
      <WelcomeModal />
      <TopBar />
      <Feed initialPosts={posts} feedType="home" />
      <BottomNav />
    </main>
  )
}
